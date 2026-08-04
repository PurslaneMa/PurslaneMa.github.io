import {useEffect,useMemo,useRef,useState} from 'react'
import {EditorState} from '@codemirror/state'
import {EditorView,keymap,lineNumbers,highlightActiveLine} from '@codemirror/view'
import {defaultKeymap,history,historyKeymap} from '@codemirror/commands'
import {markdown,markdownLanguage} from '@codemirror/lang-markdown'
import {oneDark} from '@codemirror/theme-one-dark'
import {marked} from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type Item={_id:string;note_id?:string;title?:string;source?:string;_content?:string;date?:string;categories?:string[];tags?:string[];references?:string[];isDraft?:boolean}
type Panel='editor'|'map'|'check'|'versions'
const api=async <T,>(path:string,init?:RequestInit):Promise<T>=>{const r=await fetch('/admin/api/'+path,init);if(!r.ok)throw Error((await r.text())||'请求失败');return r.json()}
function renderMarkdown(source:string){let html=marked.parse(source,{breaks:true,gfm:true}) as string;html=html.replace(/\$\$([\s\S]+?)\$\$/g,(_,x)=>katex.renderToString(x,{displayMode:true,throwOnError:false})).replace(/\$([^$\n]+?)\$/g,(_,x)=>katex.renderToString(x,{throwOnError:false}));return html}
function category(item:Item){return (item.categories||['未分类']).join(' / ')}

export function EditorApp(){
 const [mode,setMode]=useState<'posts'|'pages'>('posts'),[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null),[preview,setPreview]=useState(false),[query,setQuery]=useState(''),[tree,setTree]=useState(true),[panel,setPanel]=useState<Panel>('editor'),[status,setStatus]=useState('就绪'),[error,setError]=useState('');
 const editorRef=useRef<HTMLDivElement>(null),viewRef=useRef<EditorView|null>(null)
 const load=async()=>{setStatus('正在加载…');setError('');try{const data=await api<Item[]>(mode+'/list');setItems(Array.isArray(data)?data:[]);setStatus(`${data.length} 项已加载`)}catch(e){setItems([]);setError(e instanceof Error?e.message:'加载失败');setStatus('加载失败')}}
 useEffect(()=>{load()},[mode])
 useEffect(()=>{if(!selected||!editorRef.current||preview)return;viewRef.current?.destroy();const s=EditorState.create({doc:selected._content||'',extensions:[lineNumbers(),highlightActiveLine(),history(),keymap.of([...defaultKeymap,...historyKeymap]),markdown({base:markdownLanguage}),oneDark,EditorView.updateListener.of(u=>{if(u.docChanged)setStatus('未保存')})]});viewRef.current=new EditorView({state:s,parent:editorRef.current});return()=>viewRef.current?.destroy()},[selected,preview])
 const visible=useMemo(()=>items.filter(x=>!query||[x.title,x.source,x.note_id,category(x),(x.tags||[]).join(' ')].join(' ').toLowerCase().includes(query.toLowerCase())),[items,query])
 const grouped=useMemo(()=>visible.reduce<Record<string,Item[]>>((a,i)=>(a[category(i)]??=[],a[category(i)].push(i),a),{}),[visible])
 const content=()=>viewRef.current?.state.doc.toString()||selected?._content||''
 const save=async()=>{if(!selected)return;try{const body={title:selected.title,date:selected.date||new Date().toISOString(),_content:content(),categories:selected.categories,tags:selected.tags,references:selected.references||[],note_id:selected.note_id};await api(mode+'/'+selected._id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setStatus('已保存');await load()}catch(e){setError(e instanceof Error?e.message:'保存失败');setStatus('保存失败')}}
 const checks=selected?[!selected.note_id&&'缺少稳定 note_id',!selected.title&&'缺少标题',!content().trim()&&'正文为空',!selected.categories?.length&&'未设置分类',!selected.tags?.length&&'未设置标签'].filter(Boolean) as string[]:[]
 return <div className="app-shell"><header><div className="brand"><strong>Purslane Notes</strong><span>本机编辑器</span></div><nav><button className={mode==='posts'?'active':''} onClick={()=>{setMode('posts');setSelected(null);setPanel('editor')}}>文章</button><button className={mode==='pages'?'active':''} onClick={()=>{setMode('pages');setSelected(null);setPanel('editor')}}>页面</button></nav><span className="status">{status}</span></header>
  <div className="commandbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索标题、路径、ID、分类或标签"/><button onClick={()=>setTree(!tree)}>{tree?'快速定位':'树形目录'}</button><button onClick={save}>保存</button><button onClick={load}>刷新</button></div>
  <div className="workspace-tools"><button className={panel==='editor'?'active':''} onClick={()=>setPanel('editor')}>编辑器</button><button className={panel==='map'?'active':''} onClick={()=>setPanel('map')}>内容地图</button><button className={panel==='check'?'active':''} onClick={()=>setPanel('check')}>发布检查</button><button className={panel==='versions'?'active':''} onClick={()=>setPanel('versions')}>版本快照</button></div>
  {error&&<div className="error-banner">{error} <button onClick={load}>重试</button></div>}
  <main className="workspace"><aside className="sidebar"><h3>{mode==='posts'?'文章目录':'页面目录'} <small>{visible.length}/{items.length}</small></h3>{tree?Object.entries(grouped).map(([group,rows])=><div className="tree-group" key={group}><div className="tree-folder">⌄ {group}</div>{rows.map(i=><div draggable key={i._id} className={selected?._id===i._id?'file active':'file'} onClick={()=>{setSelected(i);setPanel('editor')}}><span className="file-dot">·</span>{i.title||i.source}</div>)}</div>):visible.map(i=><div key={i._id} className={selected?._id===i._id?'file active':'file'} onClick={()=>{setSelected(i);setPanel('editor')}}>{i.title||i.source}</div>)}</aside>
   <section className="editor-pane">{panel==='map'&&<div className="panel"><h2>内容地图</h2><p>共 {items.length} 项，当前展示 {visible.length} 项。</p>{Object.entries(grouped).map(([g,r])=><div className="map-row" key={g}><strong>{g}</strong><span>{r.length} 篇</span></div>)}</div>}{panel==='check'&&<div className="panel"><h2>发布检查</h2>{selected?<>{checks.length?<ul>{checks.map(x=><li key={x}>⚠ {x}</li>)}</ul>:<p className="ok">✓ 当前文章通过基础检查</p>}<p className="muted">ID：{selected.note_id||'未生成'}</p></>:<p>请先选择文章。</p>}</div>}{panel==='versions'&&<div className="panel"><h2>版本快照</h2><p>保存前可在本地 Git 中回溯当前文件；发布同步由后端脚本执行。</p><button onClick={save}>保存当前快照</button></div>}{panel==='editor'&&<>{selected?<><div className="editor-tabs"><button className={!preview?'active':''} onClick={()=>setPreview(false)}>编辑</button><button className={preview?'active':''} onClick={()=>setPreview(true)}>预览</button></div>{preview?<article className="preview" dangerouslySetInnerHTML={{__html:renderMarkdown(content())}}/>:<div ref={editorRef} className="code-editor"/>}<div className="metadata"><span>固定 ID：{selected.note_id||'缺失'}</span><span>路径：{selected.source}</span><span>引用：{(selected.references||[]).length}</span></div></>:<div className="empty">从左侧选择一篇文章开始编辑</div>}</>}</section>
  </main></div>
}
