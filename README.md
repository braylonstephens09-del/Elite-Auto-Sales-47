{
  "name": "elite-auto-sales-al",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "stripe": "^12.0.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "node-fetch": "^2.6.7"
  }
}
// server/index.js
// Simple Node/Express server that serves the SPA and creates Stripe PaymentIntents.
// Requires environment variable STRIPE_SECRET_KEY (set to your Stripe test/live secret).
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER';
const stripe = require('stripe')(STRIPE_SECRET);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// create payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', description } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required (in cents)' });
    const pi = await stripe.paymentIntents.create({
      amount: parseInt(amount, 10),
      currency,
      description,
      automatic_payment_methods: { enabled: true }
    });
    res.json({ clientSecret: pi.client_secret, id: pi.id });
  } catch (err) {
    console.error('Stripe error', err);
    res.status(500).json({ error: err.message });
  }
});

// serve SPA (public/index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Elite Auto Sales</title>
  <style>
    /* Simple responsive styles for web + mobile-browser */
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial; background:#f5f6f8; margin:0; padding:12px}
    .container{max-width:1100px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:center}
    h1{margin:0;font-size:20px}
    .nav{display:flex;gap:8px;align-items:center}
    .btn{background:#007bff;color:#fff;padding:8px 12px;border-radius:8px;border:0;cursor:pointer}
    .secondary{background:#fff;color:#333;border:1px solid #ddd}
    .card{background:#fff;padding:12px;border-radius:10px;margin-top:12px;border:1px solid #e7e7e7}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
    .vehicle-card{background:#fff;border-radius:8px;padding:8px;border:1px solid #eaeaea;cursor:pointer}
    .vehicle-image{width:100%;height:150px;object-fit:cover;border-radius:6px}
    input,select,textarea{width:100%;padding:8px;margin-top:8px;border-radius:6px;border:1px solid #ddd}
    .row{display:flex;gap:8px}
    .half{flex:1}
    .muted{color:#666;font-size:13px}
    .modal{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:12px}
    .modal-card{background:#fff;padding:12px;border-radius:10px;max-width:900px;width:100%;max-height:90vh;overflow:auto}
    .gallery-img{width:100%;max-height:420px;object-fit:contain;border-radius:6px}
    .small{font-size:13px;color:#444}
    .frazer-like{display:flex;gap:12px}
    .sidebar{width:260px;background:#fff;padding:12px;border-radius:8px;border:1px solid #e6e6e6}
    .content{flex:1}
    .searchbar{display:flex;gap:8px;margin-top:10px}
    .tag{display:inline-block;padding:6px 10px;border-radius:12px;background:#f0f0f2;border:1px solid #e0e0e0;margin-right:6px;font-size:13px}
    .calc-out{font-weight:bold;font-size:16px;color:#111}
  </style>

  <!-- React + ReactDOM via CDN -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Firebase (compat) -->
  <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
</head>
<body>
  <div id="root" class="container"></div>

<script>
  const firebaseConfig = {
  apiKey: "AIzaSyAv1OvBkYmy24T5hctg4U1pFeSKDN_mAUg",
  authDomain: "elite-auto-sales.firebaseapp.com",
  projectId: "elite-auto-sales",
  storageBucket: "elite-auto-sales.firebasestorage.app",
  messagingSenderId: "508508918035",
  appId: "1:508508918035:web:992c42ad60d64100ad4ae6"
};
  /* ---------- helpers ---------- */
function currency(n){ return '$' + (Number(n||0).toFixed(2)); }
const MONTHS = 96;
function calcMonthly(retail, down){
  const p = Math.max(0, Number(retail||0) - Number(down||0));
  return (p / MONTHS).toFixed(2);
}

/* ---------- APP ---------- */
function App(){
  const [route, setRoute] = useState('public'); // 'public' | 'staff' | 'customer'
  const [customerId, setCustomerId] = useState('');
  return e('div',null,
    e('div',{className:'header'}, e('h1',null,'Elite Auto Sales'), e('div',{className:'nav'},
      e('select',{value:route,onChange:ev=>setRoute(ev.target.value)}, e('option',{value:'public'},'Public Site'), e('option',{value:'staff'},'Staff Portal'), e('option',{value:'customer'},'Customer Portal')),
      e('input',{placeholder:'Customer ID (demo)', style:{marginLeft:8,padding:8,borderRadius:6,border:'1px solid #ddd'}, value:customerId, onChange:ev=>setCustomerId(ev.target.value)}),
      e('a',{href:'https://eliteautosalesal.com','target':'_blank', className:'small', style:{marginLeft:8,textDecoration:'underline'}}, 'Original Site')
    )),
    route === 'public' ? e(PublicSite) : route === 'staff' ? e(StaffShell) : e(CustomerShell,{customerId})
  );
}

/* ---------- PUBLIC SITE (homepage inventory) ---------- */
function PublicSite(){
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize] = useState(20);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState({q:'', maxPrice:'', minPrice:'', make:''});
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [calcInput, setCalcInput] = useState({retail:'',down:''});
  const [aiOpen, setAiOpen] = useState(false);

  // initial load (first page)
  useEffect(()=>{
    loadPage(null);
  },[]);

  async function loadPage(start){
    setLoading(true);
    let q = db.collection('vehicles').orderBy('createdAt','desc').limit(pageSize);
    if(start) q = q.startAfter(start);
    const snap = await q.get();
    const docs = [];
    snap.forEach(d => docs.push({ id:d.id, ...d.data() }));
    if(start) setVehicles(prev => prev.concat(docs)); else setVehicles(docs);
    setLastVisible(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === pageSize);
    setLoading(false);
  }

  // client-side filter
  const filtered = vehicles.filter(v => {
    if(filter.q && !((v.make||'') + ' ' + (v.model||'')).toLowerCase().includes(filter.q.toLowerCase())) return false;
    if(filter.make && (v.make||'').toLowerCase() !== filter.make.toLowerCase()) return false;
    if(filter.minPrice && Number(v.price||0) < Number(filter.minPrice)) return false;
    if(filter.maxPrice && Number(v.price||0) > Number(filter.maxPrice)) return false;
    return true;
  });

  return e('div',null,
    e('div',{className:'card'}, e('h2',null,'Inventory — Elite Auto Sales'), e('div',{className:'muted small'}, 'Buy Here Pay Here — in-house financing up to 96 payments'), 
      e('div',{className:'searchbar'}, e('input',{placeholder:'Search make or model', value:filter.q, onChange:ev=>setFilter({...filter,q:ev.target.value})}), e('input',{placeholder:'Max price', value:filter.maxPrice, onChange:ev=>setFilter({...filter, maxPrice:ev.target.value})}), e('input',{placeholder:'Min price', value:filter.minPrice, onChange:ev=>setFilter({...filter, minPrice:ev.target.value})}), e('button',{className:'btn secondary', onClick:()=>setFilter({q:'',maxPrice:'',minPrice:'',make:''})}, 'Clear'))),
    e('div',{className:'card'}, e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
      e('div',null, e('span',{className:'tag'}, 'Semi-monthly payments: 15th & last')),
      e('div',null, e('button',{className:'btn', onClick:()=>setAiOpen(true)}, 'AI Assistant'), ' ', e('button',{className:'btn secondary', onClick:()=>{ /* scroll to calc */ document.getElementById('payment-calc')?.scrollIntoView({behavior:"smooth"}) } }, 'Payment Calculator'))
    )),
    e('div',{className:'grid'},
      filtered.map(v => e('div',{key:v.id, className:'vehicle-card', onClick:()=>setSelectedVehicle(v)},
        e('img',{src:v.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image', className:'vehicle-image'}),
        e('div',null, e('strong',null, v.make + ' ' + v.model)),
        e('div',null, currency(v.price), ' • Down: ', currency(v.downPayment || 0)),
        e('div',{className:'small'}, 'Payment est (96): $' + calcMonthly(v.price, v.downPayment))
      ))
    ),
    e('div',null, hasMore ? e('button',{className:'btn', onClick:()=>loadPage(lastVisible)}, loading ? 'Loading…' : 'Load more') : e('div',{className:'muted small', style:{marginTop:8}}, 'End of list for now')),

    // payment calculator
    e('div',{id:'payment-calc', className:'card'},
      e('h3',null,'Payment Calculator'),
      e('div',{className:'row'}, e('input',{className:'half',placeholder:'Retail price', value:calcInput.retail, onChange:ev=>setCalcInput({...calcInput, retail:ev.target.value})}), e('input',{className:'half', placeholder:'Down payment', value:calcInput.down, onChange:ev=>setCalcInput({...calcInput, down:ev.target.value})})),
      e('div',{className:'small', style:{marginTop:8}}, '96 payments (~4 years)'),
      e('div',{className:'calc-out', style:{marginTop:8}}, 'Estimated payment: $' + calcMonthly(calcInput.retail||0, calcInput.down||0))
    ),

    // Vehicle modal (gallery)
    selectedVehicle ? e('div',{className:'modal', onClick:()=>setSelectedVehicle(null)},
      e('div',{className:'modal-card', onClick:ev=>ev.stopPropagation()},
        e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}}, e('h3',null, selectedVehicle.make + ' ' + selectedVehicle.model), e('button',{className:'btn secondary', onClick:()=>setSelectedVehicle(null)}, 'Close')),
        // gallery: assume selectedVehicle.images array or imageUrl
        e('div',null, (selectedVehicle.images && selectedVehicle.images.length>0) ? selectedVehicle.images.map((src,i)=> e('img',{key:i,src:src,className:'gallery-img', style:{marginTop:8}})) : e('img',{src:selectedVehicle.imageUrl || 'https://via.placeholder.com/800x500?text=No+Image', className:'gallery-img'})),
        e('div',{style:{marginTop:8}}, e('strong',null,'Price: '), currency(selectedVehicle.price), e('div',null,'Down: ' + currency(selectedVehicle.downPayment || 0))),
        e('div',{style:{marginTop:8}}, e('strong',null,'Maintenance / History:'), e('div',null, selectedVehicle.maintenance || 'None recorded')),
        e('div',{style:{marginTop:12}}, e('button',{className:'btn', onClick:()=>{ alert('To pay online, staff will create a PaymentIntent via Stripe or customer pays via staff portal.'); }}, 'Pay / Request Payment Link'))
      )
    ) : null,

    // AI Assistant modal
    aiOpen ? e(AIAssistant,{onClose:()=>setAiOpen(false)}) : null
  );
}

/* ---------- AI Assistant (client-side) ---------- */
function AIAssistant({onClose}){
  const [step, setStep] = useState(0);
  const [state, setState] = useState({budget:'', seats:'', mustHave:''});
  const [result, setResult] = useState(null);

  const questions = [
    {key:'budget', label:'Monthly budget (USD)'},
    {key:'seats', label:'Number of seats needed (e.g., 2,4,5)'},
    {key:'mustHave', label:'Must-haves (4WD, low miles, etc.) (optional)'}
  ];

  const next = async ()=>{
    if(step < questions.length - 1) return setStep(step + 1);
    // final: run simple match against Firestore
    const bud = Number(state.budget||0);
    const snap = await db.collection('vehicles').orderBy('createdAt','desc').limit(500).get();
    const candidates = [];
    snap.forEach(d => {
      const v = { id:d.id, ...d.data() };
      // estimate monthly payment
      const p = Number(((v.price||0) - (v.downPayment||0)) / 96);
      // basic matching rules
      let score = 0;
      if(p <= bud) score += 2;
      if(state.mustHave && ( (v.maintenance||'').toLowerCase().includes(state.mustHave.toLowerCase()) || (v.make+' '+v.model).toLowerCase().includes(state.mustHave.toLowerCase()) )) score += 1;
      if(state.seats && state.seats != '' && String(v.seats || '').includes(state.seats)) score += 1;
      if(score>0) candidates.push({v,score,monthly:p});
    });
    candidates.sort((a,b)=>b.score - a.score || a.monthly - b.monthly);
    setResult(candidates.slice(0,10));
    setStep(step+1);
  };

  return e('div',{className:'modal', onClick:()=>onClose()},
    e('div',{className:'modal-card', onClick:ev=>ev.stopPropagation()},
      e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}}, e('h3',null,'AI Car Finder'), e('button',{className:'btn secondary', onClick:()=>onClose()}, 'Close')),
      step <= questions.length -1 ? e('div',null,
        e('div',null, e('label',null, questions[step].label)),
        e('input',{placeholder:questions[step].label, value: state[questions[step].key]||'', onChange:ev=>setState({...state, [questions[step].key]: ev.target.value})}),
        e('div',{style:{marginTop:8}}, e('button',{className:'btn', onClick:next}, step < questions.length -1 ? 'Next' : 'Find Matches'))
      ) : result ? e('div',null,
        e('h4',null,'Top Matches'),
        result.map(r => e('div',{key:r.v.id, className:'card'},
          e('div',{style:{display:'flex',gap:12}}, e('img',{src:r.v.imageUrl||'https://via.placeholder.com/200', style:{width:120,height:80,objectFit:'cover',borderRadius:6}}),
            e('div',null, e('strong',null, r.v.make + ' ' + r.v.model), e('div',null,'Est monthly: $' + Number(r.monthly).toFixed(2)), e('div',null,'Price: ' + currency(r.v.price))
          )
        )),
        e('div',{style:{marginTop:8}}, e('button',{className:'btn', onClick:onClose}, 'Close'))
      ) : e('div',null, 'No matches found.')
    )
  );
}

/* ---------- STAFF SHELL + Frazer-like staff portal ---------- */
function StaffShell(){
  return e('div',{className:'frazer-like'},
    e('div',{className:'sidebar card'}, e('h3',null,'Staff Portal'), e('div',{className:'muted small'}, 'Frazer-style menu'), 
      e('div',null, e('button',{className:'btn', onClick:()=>document.getElementById('staff-main')?.scrollIntoView({behavior:'smooth'})}, 'Inventory')),
      e('div',null, e('button',{className:'btn secondary', onClick:()=>document.getElementById('customers-main')?.scrollIntoView({behavior:'smooth'})}, 'Customers')),
      e('div',null, e('button',{className:'btn secondary', onClick:()=>document.getElementById('alerts-main')?.scrollIntoView({behavior:'smooth'})}, 'Alerts')),
      e('div',null, e('button',{className:'btn secondary', onClick:seedSampleVehicles}, 'Seed Sample Vehicles (adds ~50)')),
      e('div',{style:{marginTop:12}}, e('div',{className:'small'}, 'Staff login & roles coming later'))
    ),
    e('div',{className:'content', id:'staff-main'}, e(StaffPortal))
  );
}

/* ---------- STAFF PORTAL component ---------- */
function StaffPortal(){
  const [vehicles,setVehicles] = useState([]);
  const [customers,setCustomers] = useState([]);
  const [alerts,setAlerts] = useState([]);
  const [form,setForm] = useState({make:'',model:'',year:'',price:'',downPayment:'',imageUrl:'',maintenance:'',seats:''});
  const [manualPay,setManualPay] = useState({customerId:'',vehicleId:'',amount:'',method:'Cash',notes:''});
  const [stripePay,setStripePay] = useState({customerId:'',vehicleId:'',amount:''});

  useEffect(()=>{
    const vUnsub = db.collection('vehicles').orderBy('createdAt','desc').onSnapshot(s=>{ const arr=[]; s.forEach(d=>arr.push({id:d.id,...d.data()})); setVehicles(arr); });
    const cUnsub = db.collection('customers').orderBy('createdAt','desc').onSnapshot(s=>{ const arr=[]; s.forEach(d=>arr.push({id:d.id,...d.data()})); setCustomers(arr); });
    const aUnsub = db.collection('staffAlerts').orderBy('date','desc').onSnapshot(s=>{ const arr=[]; s.forEach(d=>arr.push({id:d.id,...d.data()})); setAlerts(arr); });
    return ()=>{ vUnsub(); cUnsub(); aUnsub(); };
  },[]);

  const addVehicle = async ()=>{
    if(!form.make || !form.model) return alert('Enter make & model');
    await db.collection('vehicles').add({
      make: form.make,
      model: form.model,
      year: form.year,
      price: Number(form.price||0),
      downPayment: Number(form.downPayment||0),
      maintenance: form.maintenance || '',
      imageUrl: form.imageUrl || '',
      seats: form.seats || '',
      images: form.imageUrl ? [form.imageUrl] : [],
      createdAt: new Date(),
      sold: false
    });
    setForm({make:'',model:'',year:'',price:'',downPayment:'',imageUrl:'',maintenance:''});
    alert('Vehicle added');
  };

  const addCustomer = async ()=>{
    const name = prompt('Customer name?'); if(!name) return;
    const ref = await db.collection('customers').add({ name, email:'', phone:'', vehicleId:null, balanceRemaining:0, paymentPlan:'semi-monthly', nextPaymentDue:null, pickupNote:null, insurance:null, createdAt:new Date() });
    alert('Customer added. ID: ' + ref.id);
  };

  const addManualPayment = async ()=>{
    if(!manualPay.customerId || !manualPay.amount) return alert('Customer and amount required');
    await db.collection('payments').add({ customerId:manualPay.customerId, vehicleId:manualPay.vehicleId||null, amount:Number(manualPay.amount), method:manualPay.method, notes:manualPay.notes||'', timestamp:new Date() });
    const custRef = db.collection('customers').doc(manualPay.customerId);
    const snap = await custRef.get();
    if(snap.exists) await custRef.update({ balanceRemaining: (snap.data().balanceRemaining||0) - Number(manualPay.amount) });
    alert('Payment recorded');
    setManualPay({customerId:'',vehicleId:'',amount:'',method:'Cash',notes:''});
  };

  const processStripe = async ()=>{
    if(!stripePay.customerId || !stripePay.amount) return alert('fill in stripes');
    try {
      const resp = await fetch('/create-payment-intent', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: Math.round(Number(stripePay.amount)*100) }) });
      const j = await resp.json();
      if(j.error) throw new Error(j.error);
      await db.collection('payments').add({ customerId:stripePay.customerId, vehicleId:stripePay.vehicleId||null, amount: Number(stripePay.amount), method:'Stripe', status:'paid', timestamp:new Date(), stripeIntentId: j.id || null });
      const custRef = db.collection('customers').doc(stripePay.customerId); const snap = await custRef.get(); if(snap.exists) await custRef.update({ balanceRemaining: (snap.data().balanceRemaining||0) - Number(stripePay.amount) });
      alert('Stripe Payment demo recorded.');
      setStripePay({customerId:'',vehicleId:'',amount:''});
    } catch (err) { alert('Stripe error: ' + err.message); }
  };

  const markHandled = async (id) => { await db.collection('staffAlerts').doc(id).update({ seen:true }); };

  return e('div',null,
    e('div',{className:'card'}, e('h3',null,'Inventory Manager'),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Make', value:form.make, onChange:ev=>setForm({...form,make:ev.target.value})}), e('input',{className:'half', placeholder:'Model', value:form.model, onChange:ev=>setForm({...form,model:ev.target.value})})),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Year', value:form.year, onChange:ev=>setForm({...form,year:ev.target.value})}), e('input',{className:'half', placeholder:'Seats (optional)', value:form.seats, onChange:ev=>setForm({...form,seats:ev.target.value})})),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Retail price', value:form.price, onChange:ev=>setForm({...form,price:ev.target.value})}), e('input',{className:'half', placeholder:'Down payment', value:form.downPayment, onChange:ev=>setForm({...form,downPayment:ev.target.value})})),
      e('input',{placeholder:'Primary image URL', value:form.imageUrl, onChange:ev=>setForm({...form,imageUrl:ev.target.value})}),
      e('textarea',{placeholder:'Maintenance & costs (comma separated)', value:form.maintenance, onChange:ev=>setForm({...form,maintenance:ev.target.value})}),
      e('div',{className:'small'}, 'Est monthly (96): $' + calcMonthly(form.price || 0, form.downPayment || 0)),
      e('div',null, e('button',{className:'btn', onClick:addVehicle}, 'Add Vehicle'), e('button',{className:'btn secondary', onClick:()=>{ navigator.clipboard.writeText('Use Seed to add many vehicles'); } }, 'How to seed?'))
    ),
    e('div',{id:'customers-main', className:'card'}, e('h3',null,'Customers'), e('button',{className:'btn', onClick:addCustomer}, 'Add Customer'),
      customers.length === 0 ? e('div',null,'No customers yet') : customers.map(c => e('div',{key:c.id, style:{padding:8,border:'1px solid #eee',borderRadius:6,marginTop:6}},
        e('div',{style:{fontWeight:'bold'}}, c.name + ' (ID: ' + c.id + ')'),
        e('div',null,'Balance: ' + currency(c.balanceRemaining||0)),
        e('div',null,'Pickup Note: ' + (c.pickupNote ? ('$' + c.pickupNote.amount + ' due ' + new Date(c.pickupNote.dueDate).toLocaleDateString()) : 'None')),
        e('div',null,'Insurance: ' + (c.insurance ? (c.insurance.company + ' / ' + c.insurance.coverage) : 'None'))
      ))
    ),
    e('div',{className:'card'}, e('h3',null,'Payments & Stripe'),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Customer ID', value:manualPay.customerId, onChange:ev=>setManualPay({...manualPay,customerId:ev.target.value})}), e('input',{className:'half', placeholder:'Vehicle ID', value:manualPay.vehicleId, onChange:ev=>setManualPay({...manualPay,vehicleId:ev.target.value})})),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Amount', value:manualPay.amount, onChange:ev=>setManualPay({...manualPay,amount:ev.target.value})}), e('select',{className:'half', value:manualPay.method, onChange:ev=>setManualPay({...manualPay,method:ev.target.value})}, e('option',{value:'Cash'}, 'Cash'), e('option',{value:'Card'}, 'Card'), e('option',{value:'Phone'}, 'Phone'))),
      e('textarea',{placeholder:'Notes', value:manualPay.notes, onChange:ev=>setManualPay({...manualPay,notes:ev.target.value})}),
      e('div',null, e('button',{className:'btn', onClick:addManualPayment}, 'Record In-Person Payment')),
      e('div',{style:{height:8}}),
      e('div',null, e('h4',null,'Process Online Payment (create PaymentIntent)'), e('input',{placeholder:'Customer ID', value:stripePay.customerId, onChange:ev=>setStripePay({...stripePay,customerId:ev.target.value})}), e('input',{placeholder:'Amount (USD)', value:stripePay.amount, onChange:ev=>setStripePay({...stripePay,amount:ev.target.value})}), e('button',{className:'btn', onClick:processStripe}, 'Create PaymentIntent & Record')),
    ),
    e('div',{id:'alerts-main', className:'card'}, e('h3',null,'Alerts / Repo / Compliance'),
      e('div',null, e('button',{className:'btn', onClick:runInsuranceCheckNow}, 'Run Insurance Check Now (manual)')),
      alerts.length===0 ? e('div',null,'No alerts') : alerts.map(a => e('div',{key:a.id, className:'alert'},
        e('div',null, e('strong',null,a.type)),
        e('div',null,'Customer: ' + (a.customerId || 'N/A')),
        e('div',null,'Details: ' + (a.details||'')),
        !a.seen ? e('div',null, e('button',{className:'btn', onClick:()=>markHandled(a.id)}, 'Mark Handled')) : e('div',null,'Handled')
      ))
    )
  );
}

/* ---------- Customer Shell / Portal ---------- */
function CustomerShell({customerId}){
  return e('div',null, e('div',{className:'content'}, e(CustomerPortal,{customerId})));
}

function CustomerPortal({customerId}){
  const [cust,setCust] = useState(null);
  const [calc, setCalc] = useState({retail:'',down:''});

  useEffect(()=>{
    if(!customerId) { setCust(null); return; }
    const unsub = db.collection('customers').doc(customerId).onSnapshot(s => setCust(s.exists ? { id:s.id, ...s.data() } : null));
    return ()=>unsub();
  },[customerId]);

  const updateInsurance = async (k, v) => {
    if(!customerId) return alert('No customer id');
    const snap = await db.collection('customers').doc(customerId).get();
    const cur = snap.exists ? snap.data().insurance || {} : {};
    await db.collection('customers').doc(customerId).update({ insurance: { ...cur, [k]: v } });
    alert('Insurance saved');
  };

  return e('div',null,
    e('div',{className:'card'}, e('h3',null,'Customer Account'),
      !customerId ? e('div',null,'Enter your Customer ID in the top-right to load your account (staff can add customers in Staff Portal)') :
      cust ? e('div',null, e('div',null, e('strong',null,'Name: '), cust.name), e('div',null, e('strong',null,'Balance: '), currency(cust.balanceRemaining||0)), e('div',null, e('strong',null,'Payment Plan: '), cust.paymentPlan || 'semi-monthly'), e('div',null, e('strong',null,'Pickup Note: '), cust.pickupNote ? ('$' + cust.pickupNote.amount + ' due ' + new Date(cust.pickupNote.dueDate).toLocaleDateString()) : 'None') ) : e('div',null,'Customer not found')
    ),

    e('div',{className:'card'}, e('h3',null,'Insurance (edit)'),
      e('input',{placeholder:'Company', defaultValue:cust?.insurance?.company||'', onBlur:ev=>updateInsurance('company', ev.target.value)}),
      e('input',{placeholder:'Policy #', defaultValue:cust?.insurance?.policyNumber||'', onBlur:ev=>updateInsurance('policyNumber', ev.target.value)}),
      e('input',{placeholder:'Coverage (type full)', defaultValue:cust?.insurance?.coverage||'', onBlur:ev=>updateInsurance('coverage', ev.target.value)}),
      e('input',{placeholder:'Deductible (500-1000)', defaultValue:cust?.insurance?.deductible||'', onBlur:ev=>updateInsurance('deductible', Number(ev.target.value||0))}),
      e('input',{placeholder:'Lienholder', defaultValue:cust?.insurance?.lienholder||'Elite Auto Sales', onBlur:ev=>updateInsurance('lienholder', ev.target.value)}),
      e('input',{placeholder:'Expiration YYYY-MM-DD', defaultValue:cust?.insurance?.expiration||'', onBlur:ev=>updateInsurance('expiration', ev.target.value)})
    ),

    e('div',{className:'card'}, e('h3',null,'Payment Calculator (also on homepage)'),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Retail', value:calc.retail, onChange:ev=>setCalc({...calc,retail:ev.target.value})}), e('input',{className:'half', placeholder:'Down', value:calc.down, onChange:ev=>setCalc({...calc,down:ev.target.value})})),
      e('div',{className:'calc-out'}, 'Estimated Monthly: $' + calcMonthly(calc.retail||0, calc.down||0))
    )
  );
}

/* ---------- Utilities: seed sample vehicles (for testing many vehicles) ---------- */
async function seedSampleVehicles(){
  if(!confirm('This will add 50 sample vehicles to your Firestore for testing. Proceed?')) return;
  const makes = ['Ford','Chevrolet','Toyota','Nissan','Honda','Dodge','Jeep','GMC','Kia','Hyundai'];
  const models = ['Focus','Impala','Camry','Altima','Civic','Charger','Wrangler','Sierra','Soul','Elantra'];
  const imgs = [
    'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&q=80',
    'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&q=80'
  ];
  for(let i=0;i<50;i++){
    const make = makes[Math.floor(Math.random()*makes.length)];
    const model = models[Math.floor(Math.random()*models.length)];
    const price = Math.floor(2000 + Math.random()*22000);
    const down = Math.floor(200 + Math.random()*3000);
    await db.collection('vehicles').add({
      make, model, year: 2000 + Math.floor(Math.random()*25),
      price, downPayment: down, maintenance: 'Inspected, detailed', imageUrl: imgs[i % imgs.length],
      images: [imgs[i % imgs.length]],
      seats: 4 + Math.floor(Math.random()*3),
      createdAt: new Date(),
      sold: false
    });
  }
  alert('Added 50 sample vehicles. Run it multiple times to add more (use cautiously).');
}

/* ---------- Render ---------- */
ReactDOM.createRoot(document.getElementById('root')).render(e(App));
</script>
</body>
</html>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Elite Auto Sales</title>
  <script src="https://www.gstatic.com/firebasejs/10.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.22.0/firebase-firestore-compat.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    nav button { margin-right: 10px; }
    #inventory, #staffPortal, #customerPortal { display: none; margin-top: 20px; }
    input, button { margin: 5px 0; }
    .vehicle { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Elite Auto Sales</h1>
  <nav>
    <button onclick="showSection('inventory')">Public Site</button>
    <button onclick="showSection('staffPortal')">Staff Portal</button>
    <button onclick="showSection('customerPortal')">Customer Portal</button>
  </nav>

  <!-- PUBLIC INVENTORY -->
  <div id="inventory">
    <h2>Vehicle Inventory</h2>
    <div id="vehicleList"></div>
  </div>
const firebaseConfig = {
  apiKey: "AIzaSyAv1OvBkYmy24T5hctg4U1pFeSKDN_mAUg",
  authDomain: "elite-auto-sales.firebaseapp.com",
  projectId: "elite-auto-sales",
  storageBucket: "elite-auto-sales.firebasestorage.app",
  messagingSenderId: "508508918035",
  appId: "1:508508918035:web:992c42ad60d64100ad4ae6"
};
// ---------------- Navigation ----------------
    function showSection(section) {
      document.getElementById('inventory').style.display = 'none';
      document.getElementById('staffPortal').style.display = 'none';
      document.getElementById('customerPortal').style.display = 'none';
      document.getElementById(section).style.display = 'block';
      if(section === 'inventory') loadInventory();
    }

    // ---------------- PUBLIC INVENTORY ----------------
    async function loadInventory() {
      const snapshot = await db.collection('vehicles').get();
      const container = document.getElementById('vehicleList');
      container.innerHTML = '';
      snapshot.forEach(doc => {
        const v = doc.data();
        container.innerHTML += `
          <div class="vehicle">
            <strong>${v.year} ${v.make} ${v.model}</strong><br>
            Price: $${v.price}
          </div>
        `;
      });
    }

    // ---------------- STAFF PORTAL ----------------
    async function addVehicle() {
      const make = document.getElementById('vehicleMake').value;
      const model = document.getElementById('vehicleModel').value;
      const year = parseInt(document.getElementById('vehicleYear').value);
      const price = parseFloat(document.getElementById('vehiclePrice').value);
      await db.collection('vehicles').add({ make, model, year, price });
      alert('Vehicle added!');
    }

    async function addCustomer() {
      const name = document.getElementById('customerName').value;
      const email = document.getElementById('customerEmail').value;
      const docRef = await db.collection('customers').add({ name, email, insurance: {} });
      alert('Customer added! ID: ' + docRef.id);
    }

    // ---------------- CUSTOMER PORTAL ----------------
    let currentCustomerId = null;

    async function loadCustomer() {
      const id = document.getElementById('customerId').value;
      const doc = await db.collection('customers').doc(id).get();
      if(!doc.exists) {
        alert('Customer not found');
        return;
      }
      currentCustomerId = id;
      const data = doc.data();
      document.getElementById('customerInfo').innerHTML = `
        <strong>Name:</strong> ${data.name}<br>
        <strong>Email:</strong> ${data.email}<br>
        <strong>Insurance:</strong> ${JSON.stringify(data.insurance)}
      `;
    }

    async function updateInsurance() {
      if(!currentCustomerId) { alert('Load customer first'); return; }
      const policy = document.getElementById('insurancePolicy').value;
      const exp = document.getElementById('insuranceExp').value;
      await db.collection('customers').doc(currentCustomerId).update({
        insurance: { policy, expiry: exp }
      });
      alert('Insurance updated!');
      loadCustomer();
    }

    // ---------------- STRIPE PAYMENT ----------------
    async function makePayment() {
      if(!currentCustomerId) { alert('Load customer first'); return; }
      try {
        const response = await axios.post('/create-payment-intent', { amount: 10000 }); // $100 demo
        const clientSecret = response.data.clientSecret;
        alert('PaymentIntent created! Client secret: ' + clientSecret);
        // In production: integrate Stripe Elements for card collection
      } catch(e) {
        console.error(e);
        alert('Payment failed');
      }
    }

    // ---------------- INITIAL DISPLAY ----------------
    showSection('inventory');
  </script>
</body>
</html>
