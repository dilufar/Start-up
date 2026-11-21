import { useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, Bell, Boxes, ChevronDown, CircleHelp, LayoutDashboard,
  LogOut, Menu, Mic2, Moon, Package, Plus, Search, Settings, ShoppingCart,
  Sun, Users, Wallet, X, ArrowUpRight, CreditCard, Trash2, Pencil, CalendarDays,
  Sparkles, Store, LoaderCircle
} from "lucide-react";

const API = "http://localhost:4000/api";
const nav = [
  { group:"ASOSIY", items:[["dashboard","Bosh sahifa",LayoutDashboard],["voice","Ovozli savdo",Mic2],["sales","Savdolar tarixi",ShoppingCart]] },
  { group:"DO‘KON BOSHQARUVI", items:[["products","Mahsulotlar",Package],["inventory","Ombor",Boxes],["employees","Xodimlar",Users],["expenses","Xarajatlar",Wallet]] },
  { group:"TAHLIL", items:[["analytics","Analitika",BarChart3],["settings","Sozlamalar",Settings]] }
];
const money = n => new Intl.NumberFormat("uz-UZ",{maximumFractionDigits:0}).format(Number(n||0))+" so‘m";
const date = d => new Date(d).toLocaleString("uz-UZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});

function useApi(token) {
  return async (path, options={}) => {
    const res = await fetch(API+path, {
      ...options,
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}`, ...(options.headers||{}) }
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.message || "So‘rov bajarilmadi.");
    return data;
  };
}

function AuthScreen({ onAuth }) {
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({name:"",storeName:"",email:"",password:""});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    try{
      const res=await fetch(API+`/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const data=await res.json();if(!res.ok)throw new Error(data.message||"Xatolik");
      onAuth(data);
    }catch(err){setError(err.message+" Backend ishlayotganini tekshiring.");}
    finally{setBusy(false);}
  }
  return <div className="auth-screen"><div className="auth-card">
    <div className="brand-mark auth-mark"><Activity size={24}/></div><div className="brand-name auth-brand">VoiceShop<span> AI</span></div>
    <div className="auth-kicker">SMART RETAIL PLATFORM</div><h1>{mode==="login"?"Xush kelibsiz":"Do‘koningizni ro‘yxatdan o‘tkazing"}</h1>
    <p className="muted">{mode==="login"?"Hisobingizga kirib, do‘koningizni boshqarishni davom ettiring.":"Yangi hisob yarating. Ma’lumotlar bazasi bo‘sh holatda boshlanadi."}</p>
    <form onSubmit={submit}>
      {mode==="register"&&<><label>Ismingiz<input name="name" value={form.name} onChange={change} placeholder="Ism familiya" required minLength="2"/></label><label>Do‘kon nomi<input name="storeName" value={form.storeName} onChange={change} placeholder="Masalan, Baraka Market" required minLength="2"/></label></>}
      <label>Email<input name="email" type="email" value={form.email} onChange={change} placeholder="name@example.com" required/></label>
      <label>Parol<input name="password" type="password" value={form.password} onChange={change} placeholder="Kamida 8 ta belgi" required minLength="8"/></label>
      {error&&<div className="error-box">{error}</div>}
      <button className="btn primary full" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:null}{mode==="login"?"Kirish":"Hisob yaratish"}</button>
    </form>
    <div className="auth-switch">{mode==="login"?"Hisobingiz yo‘qmi?":"Hisobingiz bormi?"}<button onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}>{mode==="login"?"Ro‘yxatdan o‘tish":"Kirish"}</button></div>
    <div className="auth-safe">🔒 Ma’lumotlaringiz xavfsiz ulanish orqali yuboriladi.</div>
  </div></div>;
}

function Modal({title,children,onClose}) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div>;
}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}

export default function App(){
  const [session,setSession]=useState(()=>{try{return JSON.parse(localStorage.getItem("vsai_session"));}catch{return null;}});
  const [active,setActive]=useState("dashboard"),[theme,setTheme]=useState("dark"),[mobile,setMobile]=useState(false);
  const [user,setUser]=useState(null),[store,setStore]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const api=useApi(session?.token);
  const [products,setProducts]=useState([]),[employees,setEmployees]=useState([]),[expenses,setExpenses]=useState([]),[sales,setSales]=useState([]),[stats,setStats]=useState({});
  const [modal,setModal]=useState(""),[editing,setEditing]=useState(null),[query,setQuery]=useState("");
  const [productForm,setProductForm]=useState({name:"",category:"Oziq-ovqat",unit:"dona",price:"",cost:"",stock:"",minStock:""});
  const [employeeForm,setEmployeeForm]=useState({name:"",email:"",phone:"",position:"Sotuvchi",salary:""});
  const [expenseForm,setExpenseForm]=useState({title:"",category:"Ijara",amount:"",note:""});
  const [cart,setCart]=useState([]),[voiceText,setVoiceText]=useState(""),[listening,setListening]=useState(false),[payment,setPayment]=useState("CASH");
  const [toast,setToast]=useState("");

  async function loadAll(){
    if(!session?.token){setLoading(false);return;}
    setLoading(true);setError("");
    try{
      const [me,p,e,x,s,d]=await Promise.all([
        api("/auth/me"),api("/products"),api("/employees"),api("/expenses"),api("/sales"),api("/dashboard")
      ]);
      setUser(me);setStore(me.store);setProducts(p);setEmployees(e);setExpenses(x);setSales(s);setStats(d);
    }catch(err){setError(err.message);if(err.message.includes("Sessiya"))logout();}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadAll();},[session?.token]);
  function authDone(data){localStorage.setItem("vsai_session",JSON.stringify(data));setSession(data);}
  function logout(){localStorage.removeItem("vsai_session");setSession(null);setUser(null);}
  function flash(msg){setToast(msg);setTimeout(()=>setToast(""),2600);}
  const filteredProducts=useMemo(()=>products.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())),[products,query]);
  const totalCart=cart.reduce((s,x)=>s+x.quantity*Number(x.price),0);
  function openProduct(p=null){setEditing(p);setProductForm(p?{name:p.name,category:p.category,unit:p.unit,price:p.price,cost:p.cost,stock:p.stock,minStock:p.minStock}:{name:"",category:"Oziq-ovqat",unit:"dona",price:"",cost:"",stock:"",minStock:""});setModal("product");}
  async function saveProduct(e){e.preventDefault();try{const body={...productForm,price:Number(productForm.price),cost:Number(productForm.cost||0),stock:Number(productForm.stock||0),minStock:Number(productForm.minStock||0)};if(editing)await api(`/products/${editing.id}`,{method:"PUT",body:JSON.stringify(body)});else await api("/products",{method:"POST",body:JSON.stringify(body)});setModal("");await loadAll();flash("Mahsulot saqlandi.");}catch(e){flash(e.message);}}
  async function deleteProduct(p){if(!confirm(`"${p.name}" mahsulotini o‘chirasizmi?`))return;try{await api(`/products/${p.id}`,{method:"DELETE"});await loadAll();flash("Mahsulot o‘chirildi.");}catch(e){flash(e.message);}}
  function openEmployee(){setEmployeeForm({name:"",email:"",phone:"",position:"Sotuvchi",salary:""});setModal("employee");}
  async function saveEmployee(e){e.preventDefault();try{await api("/employees",{method:"POST",body:JSON.stringify({...employeeForm,salary:employeeForm.salary?Number(employeeForm.salary):undefined})});setModal("");await loadAll();flash("Xodim qo‘shildi.");}catch(e){flash(e.message);}}
  async function deleteEmployee(x){if(!confirm(`${x.name}ni o‘chirasizmi?`))return;try{await api(`/employees/${x.id}`,{method:"DELETE"});await loadAll();flash("Xodim o‘chirildi.");}catch(e){flash(e.message);}}
  async function saveExpense(e){e.preventDefault();try{await api("/expenses",{method:"POST",body:JSON.stringify({...expenseForm,amount:Number(expenseForm.amount)})});setModal("");setExpenseForm({title:"",category:"Ijara",amount:"",note:""});await loadAll();flash("Xarajat saqlandi.");}catch(e){flash(e.message);}}
  async function deleteExpense(x){if(!confirm("Xarajatni o‘chirasizmi?"))return;try{await api(`/expenses/${x.id}`,{method:"DELETE"});await loadAll();flash("Xarajat o‘chirildi.");}catch(e){flash(e.message);}}
  function addToCart(product,quantity=1){setCart(prev=>{const found=prev.find(x=>x.id===product.id);return found?prev.map(x=>x.id===product.id?{...x,quantity:x.quantity+quantity}:x):[...prev,{...product,quantity}];});}
  async function completeSale(){if(!cart.length)return;try{await api("/sales",{method:"POST",body:JSON.stringify({paymentType:payment,items:cart.map(x=>({productId:x.id,quantity:x.quantity}))})});setCart([]);setVoiceText("");await loadAll();flash("Savdo muvaffaqiyatli saqlandi.");}catch(e){flash(e.message);}}
  function startVoice(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){flash("Brauzeringiz ovoz tanishni qo‘llab-quvvatlamaydi. Chrome'da sinab ko‘ring.");return;}
    const rec=new SR();rec.lang="uz-UZ";rec.interimResults=false;rec.onstart=()=>setListening(true);rec.onend=()=>setListening(false);
    rec.onerror=()=>{setListening(false);flash("Mikrofon yoki ovoz tanishda xatolik.");};
    rec.onresult=e=>{const text=e.results[0][0].transcript;setVoiceText(text);const normalized=text.toLowerCase();let matched=0;products.forEach(p=>{if(normalized.includes(p.name.toLowerCase())){const match=normalized.match(/(\d+(?:[.,]\d+)?)/);addToCart(p,match?Number(match[1].replace(",",".")):1);matched++;}});if(!matched)flash("Mahsulot aniqlanmadi. Katalogdan qo‘lda tanlang.");};
    rec.start();
  }

  if(!session?.token)return <AuthScreen onAuth={authDone}/>;
  const titles={dashboard:"Bosh sahifa",voice:"Ovozli savdo",sales:"Savdolar tarixi",products:"Mahsulotlar",inventory:"Ombor",employees:"Xodimlar",expenses:"Xarajatlar",analytics:"Analitika",settings:"Sozlamalar"};
  const title=titles[active]||"Bosh sahifa";
  if(loading)return <div className="loading-screen"><LoaderCircle className="spin" size={30}/> Ma’lumotlar yuklanmoqda...</div>;

  return <div className={`app theme-${theme}`}>
    {mobile&&<button className="scrim" onClick={()=>setMobile(false)} />}
    <aside className={`sidebar ${mobile?"open":""}`}>
      <div className="brand-row"><div className="brand-mark"><Activity size={22}/></div><div><b>VoiceShop<span> AI</span></b><small>SMART RETAIL PLATFORM</small></div><button className="icon-btn close-mobile" onClick={()=>setMobile(false)}><X/></button></div>
      <div className="store-switch"><div className="store-avatar"><Store size={17}/></div><div><b>{store?.name||"Mening do‘konim"}</b><small>Asosiy do‘kon</small></div><ChevronDown size={15}/></div>
      <nav>{nav.map(group=><div className="nav-group" key={group.group}><small>{group.group}</small>{group.items.map(([id,label,Icon])=><button key={id} className={`nav-link ${active===id?"selected":""}`} onClick={()=>{setActive(id);setMobile(false);}}><Icon size={18}/>{label}{id==="voice"&&<em>AI</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><button className={`nav-link ${active==="settings"?"selected":""}`} onClick={()=>setActive("settings")}><Settings size={18}/>Sozlamalar</button><div className="side-help"><CircleHelp size={17}/><b>Yordam markazi</b><p>VoiceShop AI bo‘yicha qo‘llanma.</p></div><button className="logout" onClick={logout}><LogOut size={16}/> Chiqish</button><small className="version">VOICE SHOP AI · MVP 1.0</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setMobile(true)}><Menu/></button><div className="crumb">VoiceShop AI <span>/</span> <b>{title}</b></div></div><div className="top-actions"><div className="global-search"><Search size={16}/><input placeholder="Mahsulot qidirish..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="icon-btn" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun/>:<Moon/>}</button><div className="user-chip"><div className="user-avatar">{user?.name?.slice(0,1)||"U"}</div><div><b>{user?.name}</b><small>Do‘kon egasi</small></div></div></div></header>
      <section className="content">
        <div className="page-title"><div><small>DO‘KON BOSHQARUVI / {active.toUpperCase()}</small><h1>{title}</h1><p>{active==="dashboard"?"Do‘koningizning haqiqiy ko‘rsatkichlari va kundalik faoliyati.":`${title} bo‘limini boshqaring.`}</p></div><div className="today"><CalendarDays size={15}/>{new Date().toLocaleDateString("uz-UZ",{day:"numeric",month:"long",year:"numeric"})}</div></div>
        {error&&<div className="error-box">{error} <button onClick={loadAll}>Qayta urinish</button></div>}
        {active==="dashboard"&&<Dashboard stats={stats} sales={sales} setActive={setActive}/>}
        {active==="products"&&<Products rows={filteredProducts} onAdd={()=>openProduct()} onEdit={openProduct} onDelete={deleteProduct}/>}
        {active==="inventory"&&<Inventory rows={products}/>}
        {active==="employees"&&<Employees rows={employees} onAdd={openEmployee} onDelete={deleteEmployee}/>}
        {active==="expenses"&&<Expenses rows={expenses} onAdd={()=>setModal("expense")} onDelete={deleteExpense}/>}
        {active==="sales"&&<Sales rows={sales}/>}
        {active==="voice"&&<Voice products={products} cart={cart} setCart={setCart} total={totalCart} text={voiceText} listening={listening} onVoice={startVoice} onAdd={addToCart} onComplete={completeSale} payment={payment} setPayment={setPayment}/>}
        {active==="analytics"&&<Analytics stats={stats} sales={sales} expenses={expenses}/>}
        {active==="settings"&&<div className="empty-card"><Settings size={32}/><h3>Do‘kon sozlamalari</h3><p>Do‘kon: {store?.name}. Hisob: {user?.email}. Kengaytirilgan sozlamalar keyingi relizda.</p></div>}
      </section>
      <footer className="footer"><span>© 2026 VoiceShop AI. Barcha huquqlar himoyalangan.</span><span>Smart retail management <Sparkles size={13}/></span></footer>
    </main>
    {modal==="product"&&<Modal title={editing?"Mahsulotni tahrirlash":"Yangi mahsulot"} onClose={()=>setModal("")}><form className="form-grid" onSubmit={saveProduct}><Field label="Mahsulot nomi"><input required value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Masalan, Sut 1 litr"/></Field><Field label="Kategoriya"><input value={productForm.category} onChange={e=>setProductForm({...productForm,category:e.target.value})}/></Field><Field label="O‘lchov birligi"><select value={productForm.unit} onChange={e=>setProductForm({...productForm,unit:e.target.value})}><option>dona</option><option>kg</option><option>litr</option><option>quti</option><option>metr</option></select></Field><Field label="Sotuv narxi (so‘m)"><input type="number" min="0" required value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})}/></Field><Field label="Tannarx (so‘m)"><input type="number" min="0" value={productForm.cost} onChange={e=>setProductForm({...productForm,cost:e.target.value})}/></Field><Field label="Boshlang‘ich qoldiq"><input type="number" min="0" step="0.001" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})}/></Field><Field label="Minimal qoldiq"><input type="number" min="0" step="0.001" value={productForm.minStock} onChange={e=>setProductForm({...productForm,minStock:e.target.value})}/></Field><div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setModal("")}>Bekor qilish</button><button className="btn primary">Saqlash</button></div></form></Modal>}
    {modal==="employee"&&<Modal title="Xodim qo‘shish" onClose={()=>setModal("")}><form className="form-grid" onSubmit={saveEmployee}><Field label="Ism familiya"><input required minLength="2" value={employeeForm.name} onChange={e=>setEmployeeForm({...employeeForm,name:e.target.value})}/></Field><Field label="Lavozim"><input value={employeeForm.position} onChange={e=>setEmployeeForm({...employeeForm,position:e.target.value})}/></Field><Field label="Email"><input type="email" value={employeeForm.email} onChange={e=>setEmployeeForm({...employeeForm,email:e.target.value})}/></Field><Field label="Telefon"><input value={employeeForm.phone} onChange={e=>setEmployeeForm({...employeeForm,phone:e.target.value})}/></Field><Field label="Oylik (so‘m)"><input type="number" min="0" value={employeeForm.salary} onChange={e=>setEmployeeForm({...employeeForm,salary:e.target.value})}/></Field><div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setModal("")}>Bekor qilish</button><button className="btn primary">Xodimni saqlash</button></div></form></Modal>}
    {modal==="expense"&&<Modal title="Xarajat qo‘shish" onClose={()=>setModal("")}><form className="form-grid" onSubmit={saveExpense}><Field label="Xarajat nomi"><input required value={expenseForm.title} onChange={e=>setExpenseForm({...expenseForm,title:e.target.value})} placeholder="Masalan, Elektr energiyasi"/></Field><Field label="Kategoriya"><select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm,category:e.target.value})}><option>Ijara</option><option>Kommunal</option><option>Transport</option><option>Ish haqi</option><option>Boshqa</option></select></Field><Field label="Summa (so‘m)"><input type="number" min="1" required value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})}/></Field><Field label="Izoh"><input value={expenseForm.note} onChange={e=>setExpenseForm({...expenseForm,note:e.target.value})}/></Field><div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setModal("")}>Bekor qilish</button><button className="btn primary">Xarajatni saqlash</button></div></form></Modal>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function Dashboard({stats,sales,setActive}){
 const cards=[["Bugungi savdo",money(stats.revenue),"",CreditCard],["Bugungi xarajat",money(stats.expenseTotal),"",Wallet],["Mahsulotlar",stats.productCount||0,"Katalogdagi jami mahsulot",Package],["Xodimlar",stats.employeeCount||0,"Jamoa a’zolari",Users]];
 return <><div className="hero"><div><small><Sparkles size={14}/> VOICESHOP AI PLATFORM</small><h2>Do‘koningizni <span>ovozingiz bilan</span> boshqaring.</h2><p>Savdoni tezlashtiring, omborni nazorat qiling va biznesingizni haqiqiy ma’lumotlar asosida rivojlantiring.</p><button className="btn primary" onClick={()=>setActive("voice")}><Mic2 size={16}/> Ovozli savdoni boshlash <ArrowUpRight size={15}/></button></div><div className="hero-mic"><div><Mic2 size={33}/></div></div></div><div className="section-row"><div><h3>Bugungi ko‘rsatkichlar</h3><p>Serverdan olingan haqiqiy ma’lumotlar</p></div><span className="live"><i/> LIVE DATA</span></div><div className="stats">{cards.map(([label,value,note,Icon])=><div className="stat" key={label}><div><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{note||"Bugungi jami ko‘rsatkich"}</small></div>)}</div><div className="lower-grid"><div className="panel"><div className="panel-title"><div><h3>Oxirgi savdolar</h3><p>Eng so‘nggi operatsiyalar</p></div><button className="text-btn" onClick={()=>setActive("sales")}>Barchasi <ArrowUpRight size={14}/></button></div>{sales.length?<div className="simple-list">{sales.slice(0,5).map(s=><div key={s.id}><span>#{s.id.slice(-6).toUpperCase()}<small>{new Date(s.createdAt).toLocaleString("uz-UZ")}</small></span><b>{money(s.total)}</b></div>)}</div>:<div className="empty-inline"><ShoppingCart size={24}/><b>Hozircha savdo yo‘q</b><span>Birinchi savdoni amalga oshiring.</span></div>}</div><div className="panel"><div className="panel-title"><div><h3>Tezkor amallar</h3><p>Ko‘p ishlatiladigan bo‘limlar</p></div></div><div className="quick-list"><button onClick={()=>setActive("products")}><Package/>Mahsulot qo‘shish<ArrowUpRight/></button><button onClick={()=>setActive("employees")}><Users/>Xodim qo‘shish<ArrowUpRight/></button><button onClick={()=>setActive("expenses")}><Wallet/>Xarajat kiritish<ArrowUpRight/></button></div></div></div></>;
}
function Products({rows,onAdd,onEdit,onDelete}){return <><div className="toolbar"><div><h3>Mahsulotlar katalogi</h3><p>{rows.length} ta mahsulot</p></div><button className="btn primary" onClick={onAdd}><Plus size={16}/> Mahsulot qo‘shish</button></div><div className="table-wrap"><table><thead><tr><th>MAHSULOT</th><th>KATEGORIYA</th><th>NARX</th><th>TANNARX</th><th>OMBOR</th><th>AMAL</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.unit}</small></td><td>{p.category}</td><td>{money(p.price)}</td><td>{money(p.cost)}</td><td><span className={Number(p.stock)<=Number(p.minStock)?"stock-low":"stock-ok"}>{p.stock} {p.unit}</span></td><td><button className="row-action" onClick={()=>onEdit(p)}><Pencil size={15}/></button><button className="row-action danger" onClick={()=>onDelete(p)}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-inline"><Package size={25}/><b>Mahsulotlar hali qo‘shilmagan</b><span>Birinchi mahsulotingizni qo‘shishdan boshlang.</span></div>}</div></>}
function Inventory({rows}){return <div className="table-wrap"><table><thead><tr><th>MAHSULOT</th><th>QOLDIQ</th><th>MINIMAL QOLDIQ</th><th>HOLAT</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.category}</small></td><td>{p.stock} {p.unit}</td><td>{p.minStock} {p.unit}</td><td><span className={Number(p.stock)<=Number(p.minStock)?"stock-low":"stock-ok"}>{Number(p.stock)<=Number(p.minStock)?"Kam qoldiq":"Yetarli"}</span></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-inline"><Boxes size={25}/><b>Ombor bo‘sh</b><span>Mahsulot qo‘shilgach, qoldiq shu yerda ko‘rinadi.</span></div>}</div>}
function Employees({rows,onAdd,onDelete}){return <><div className="toolbar"><div><h3>Jamoa</h3><p>{rows.length} nafar xodim</p></div><button className="btn primary" onClick={onAdd}><Plus size={16}/> Xodim qo‘shish</button></div><div className="table-wrap"><table><thead><tr><th>XODIM</th><th>LAVOZIM</th><th>TELEFON</th><th>EMAIL</th><th>AMAL</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.position}</td><td>{x.phone||"—"}</td><td>{x.email||"—"}</td><td><button className="row-action danger" onClick={()=>onDelete(x)}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-inline"><Users size={25}/><b>Jamoa hali shakllanmagan</b><span>Xodimlarni qo‘shish uchun yuqoridagi tugmani bosing.</span></div>}</div></>}
function Expenses({rows,onAdd,onDelete}){return <><div className="toolbar"><div><h3>Xarajatlar ro‘yxati</h3><p>{rows.length} ta qayd</p></div><button className="btn primary" onClick={onAdd}><Plus size={16}/> Xarajat qo‘shish</button></div><div className="table-wrap"><table><thead><tr><th>XARAJAT</th><th>KATEGORIYA</th><th>SUMMA</th><th>SANA</th><th>AMAL</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.title}</b><small>{x.note||""}</small></td><td>{x.category}</td><td>{money(x.amount)}</td><td>{date(x.createdAt)}</td><td><button className="row-action danger" onClick={()=>onDelete(x)}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-inline"><Wallet size={25}/><b>Hozircha xarajatlar yo‘q</b><span>Xarajatlarni kiritganingizda shu yerda ko‘rinadi.</span></div>}</div></>}
function Sales({rows}){return <div className="table-wrap"><table><thead><tr><th>SAVDO ID</th><th>MAHSULOTLAR</th><th>TO‘LOV</th><th>JAMI</th><th>SANA</th></tr></thead><tbody>{rows.map(s=><tr key={s.id}><td>#{s.id.slice(-7).toUpperCase()}</td><td>{s.items.map(i=>`${i.product.name} × ${i.quantity}`).join(", ")}</td><td>{s.paymentType}</td><td><b>{money(s.total)}</b></td><td>{date(s.createdAt)}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty-inline"><ShoppingCart size={25}/><b>Hozircha savdolar yo‘q</b><span>Ovozli savdo orqali birinchi savdoni bajaring.</span></div>}</div>}
function Voice({products,cart,setCart,total,text,listening,onVoice,onAdd,onComplete,payment,setPayment}){return <div className="voice-layout"><div className="panel voice-panel"><div className="voice-intro"><div className="voice-badge"><Sparkles size={14}/> AI VOICE ASSISTANT</div><h2>Ovozingiz bilan <span>savdo qiling.</span></h2><p>Mahsulot nomini va miqdorini ayting. Savdoni saqlashdan oldin barcha ma’lumotlarni tekshiring.</p></div><button className={`mic-button ${listening?"recording":""}`} onClick={onVoice}><Mic2 size={34}/></button><b className="mic-label">{listening?"Tinglayapman...":"Mikrofonni bosib gapiring"}</b><p className="transcript">{text||"Masalan: 2 ta non va 1 litr sut"}</p><div className="voice-tip">Ovoz aniqlash brauzer imkoniyatiga bog‘liq. Mahsulotni quyidagi katalogdan qo‘lda ham qo‘shishingiz mumkin.</div><div className="voice-catalog"><h3>Katalogdan tanlash</h3><div className="catalog-pills">{products.map(p=><button key={p.id} onClick={()=>onAdd(p)}>{p.name} <Plus size={13}/></button>)}</div>{!products.length&&<small>Avval mahsulotlar bo‘limida katalog yarating.</small>}</div></div><div className="panel cart-panel"><div className="panel-title"><div><h3>Savdo savati</h3><p>{cart.length} turdagi mahsulot</p></div><ShoppingCart size={19}/></div>{cart.map(x=><div className="cart-item" key={x.id}><div><b>{x.name}</b><small>{money(x.price)} / {x.unit}</small></div><div className="qty"><button onClick={()=>setCart(cart.map(i=>i.id===x.id?{...i,quantity:Math.max(.001,i.quantity-1)}:i))}>−</button><span>{x.quantity}</span><button onClick={()=>setCart(cart.map(i=>i.id===x.id?{...i,quantity:i.quantity+1}:i))}>+</button><button className="remove" onClick={()=>setCart(cart.filter(i=>i.id!==x.id))}><X size={14}/></button></div></div>)}{!cart.length&&<div className="cart-empty">Savatingiz hozircha bo‘sh.</div>}<div className="cart-total"><span>Jami summa</span><b>{money(total)}</b></div><label className="payment-select">To‘lov turi<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="CASH">Naqd</option><option value="CARD">Karta</option><option value="TRANSFER">O‘tkazma</option></select></label><button className="btn primary full" disabled={!cart.length} onClick={()=>{if(confirm("Savdoni tasdiqlaysizmi? Tasdiqlangach ombor qoldig‘i yangilanadi."))onComplete();}}>Savdoni tasdiqlash <ArrowUpRight size={15}/></button></div></div>}
function Analytics({stats,sales,expenses}){return <div className="stats analytics-stats"><div className="stat"><div><span>Bugungi savdo</span><CreditCard/></div><strong>{money(stats.revenue)}</strong></div><div className="stat"><div><span>Bugungi xarajat</span><Wallet/></div><strong>{money(stats.expenseTotal)}</strong></div><div className="stat"><div><span>Taxminiy farq</span><BarChart3/></div><strong>{money(stats.estimatedGross)}</strong><small>Bu sof foyda emas: tannarx va boshqa majburiyatlar hali to‘liq hisoblanmaydi.</small></div><div className="stat"><div><span>Savdolar soni</span><ShoppingCart/></div><strong>{stats.salesCount||0}</strong></div><div className="panel"><h3>Analitika haqida</h3><p className="muted">Ko‘rsatkichlar hozircha bugungi savdo tushumi va kiritilgan xarajatlardan hisoblanadi. To‘liq foyda, marja, davr tanlash va grafiklar keyingi relizda qo‘shiladi.</p></div></div>}
