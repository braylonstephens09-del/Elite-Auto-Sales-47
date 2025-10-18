import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const e = React.createElement;
const { useState, useEffect } = React;

function currency(n){ return '$' + (Number(n||0).toFixed(2)); }
const MONTHS = 96;
function calcMonthly(retail, down){
  const p = Math.max(0, Number(retail||0) - Number(down||0));
  return (p / MONTHS).toFixed(2);
}

async function runInsuranceCheckNow(){
  const { data: customers } = await supabase.from('customers').select('*');
  if(!customers) return;
  for(const c of customers){
    const ins = c.insurance || {};
    if(!ins.expiration || new Date(ins.expiration) < new Date()){
      await supabase.from('staff_alerts').insert({
        type: 'Insurance Expired/Missing',
        customer_id: c.id,
        details: `Customer ${c.name} insurance is expired or missing`,
        seen: false
      });
    }
  }
  alert('Insurance check completed');
}

window.runInsuranceCheckNow = runInsuranceCheckNow;

function App(){
  const [route, setRoute] = useState('public');
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

  useEffect(()=>{
    loadPage(null);
  },[]);

  async function loadPage(start){
    setLoading(true);
    let query = supabase.from('vehicles').select('*').eq('sold', false).order('created_at',{ascending:false}).limit(pageSize);
    const { data, error } = await query;
    if(error){ console.error(error); setLoading(false); return; }
    const docs = data || [];
    if(start) setVehicles(prev => prev.concat(docs)); else setVehicles(docs);
    setHasMore(docs.length === pageSize);
    setLoading(false);
  }

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
      e('div',null, e('button',{className:'btn', onClick:()=>setAiOpen(true)}, 'AI Assistant'), ' ', e('button',{className:'btn secondary', onClick:()=>{ document.getElementById('payment-calc')?.scrollIntoView({behavior:"smooth"}) } }, 'Payment Calculator'))
    )),
    e('div',{className:'grid'},
      filtered.map(v => e('div',{key:v.id, className:'vehicle-card', onClick:()=>setSelectedVehicle(v)},
        e('img',{src:v.image_url || 'https://via.placeholder.com/400x300?text=No+Image', className:'vehicle-image'}),
        e('div',null, e('strong',null, v.make + ' ' + v.model)),
        e('div',null, currency(v.price), ' • Down: ', currency(v.down_payment || 0)),
        e('div',{className:'small'}, 'Payment est (96): $' + calcMonthly(v.price, v.down_payment))
      ))
    ),
    e('div',null, hasMore ? e('button',{className:'btn', onClick:()=>loadPage(lastVisible)}, loading ? 'Loading…' : 'Load more') : e('div',{className:'muted small', style:{marginTop:8}}, 'End of list for now')),

    e('div',{id:'payment-calc', className:'card'},
      e('h3',null,'Payment Calculator'),
      e('div',{className:'row'}, e('input',{className:'half',placeholder:'Retail price', value:calcInput.retail, onChange:ev=>setCalcInput({...calcInput, retail:ev.target.value})}), e('input',{className:'half', placeholder:'Down payment', value:calcInput.down, onChange:ev=>setCalcInput({...calcInput, down:ev.target.value})})),
      e('div',{className:'small', style:{marginTop:8}}, '96 payments (~4 years)'),
      e('div',{className:'calc-out', style:{marginTop:8}}, 'Estimated payment: $' + calcMonthly(calcInput.retail||0, calcInput.down||0))
    ),

    selectedVehicle ? e('div',{className:'modal', onClick:()=>setSelectedVehicle(null)},
      e('div',{className:'modal-card', onClick:ev=>ev.stopPropagation()},
        e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}}, e('h3',null, selectedVehicle.make + ' ' + selectedVehicle.model), e('button',{className:'btn secondary', onClick:()=>setSelectedVehicle(null)}, 'Close')),
        e('div',null, e('img',{src:selectedVehicle.image_url || 'https://via.placeholder.com/800x500?text=No+Image', className:'gallery-img'})),
        e('div',{style:{marginTop:8}}, e('strong',null,'Price: '), currency(selectedVehicle.price), e('div',null,'Down: ' + currency(selectedVehicle.down_payment || 0))),
        e('div',{style:{marginTop:8}}, e('strong',null,'Maintenance / History:'), e('div',null, selectedVehicle.maintenance || 'None recorded')),
        e('div',{style:{marginTop:12}}, e('button',{className:'btn', onClick:()=>{ alert('To pay online, staff will create a PaymentIntent via Stripe or customer pays via staff portal.'); }}, 'Pay / Request Payment Link'))
      )
    ) : null,

    aiOpen ? e(AIAssistant,{onClose:()=>setAiOpen(false)}) : null
  );
}

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
    const bud = Number(state.budget||0);
    const { data } = await supabase.from('vehicles').select('*').eq('sold', false).order('created_at',{ascending:false}).limit(500);
    const candidates = [];
    (data||[]).forEach(v => {
      const p = Number(((v.price||0) - (v.down_payment||0)) / 96);
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
        ...result.map(r => e('div',{key:r.v.id, className:'card'},
          e('div',{style:{display:'flex',gap:12}}, e('img',{src:r.v.image_url||'https://via.placeholder.com/200', style:{width:120,height:80,objectFit:'cover',borderRadius:6}}),
            e('div',null, e('strong',null, r.v.make + ' ' + r.v.model), e('div',null,'Est monthly: $' + Number(r.monthly).toFixed(2)), e('div',null,'Price: ' + currency(r.v.price)))
          )
        )),
        e('div',{style:{marginTop:8}}, e('button',{className:'btn', onClick:onClose}, 'Close'))
      ) : e('div',null, 'No matches found.')
    )
  );
}

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

function StaffPortal(){
  const [vehicles,setVehicles] = useState([]);
  const [customers,setCustomers] = useState([]);
  const [alerts,setAlerts] = useState([]);
  const [form,setForm] = useState({make:'',model:'',year:'',price:'',downPayment:'',imageUrl:'',maintenance:'',seats:''});
  const [manualPay,setManualPay] = useState({customerId:'',vehicleId:'',amount:'',method:'Cash',notes:''});

  useEffect(()=>{
    const loadData = async () => {
      const { data: v } = await supabase.from('vehicles').select('*').order('created_at',{ascending:false});
      setVehicles(v||[]);
      const { data: c } = await supabase.from('customers').select('*').order('created_at',{ascending:false});
      setCustomers(c||[]);
      const { data: a } = await supabase.from('staff_alerts').select('*').order('date',{ascending:false});
      setAlerts(a||[]);
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return ()=>clearInterval(interval);
  },[]);

  const addVehicle = async ()=>{
    if(!form.make || !form.model) return alert('Enter make & model');
    await supabase.from('vehicles').insert({
      make: form.make,
      model: form.model,
      year: form.year ? parseInt(form.year) : null,
      price: Number(form.price||0),
      down_payment: Number(form.downPayment||0),
      maintenance: form.maintenance || '',
      image_url: form.imageUrl || '',
      seats: form.seats ? parseInt(form.seats) : null,
      sold: false
    });
    setForm({make:'',model:'',year:'',price:'',downPayment:'',imageUrl:'',maintenance:'',seats:''});
    alert('Vehicle added');
    const { data } = await supabase.from('vehicles').select('*').order('created_at',{ascending:false});
    setVehicles(data||[]);
  };

  const addCustomer = async ()=>{
    const name = prompt('Customer name?'); if(!name) return;
    const { data, error } = await supabase.from('customers').insert({ name, email:'', phone:'', vehicle_id:null, balance_remaining:0, payment_plan:'semi-monthly', next_payment_due:null, pickup_note:null, insurance:'{}' }).select();
    if(error) { alert('Error: '+error.message); return; }
    alert('Customer added. ID: ' + data[0].id);
    const { data: c } = await supabase.from('customers').select('*').order('created_at',{ascending:false});
    setCustomers(c||[]);
  };

  const addManualPayment = async ()=>{
    if(!manualPay.customerId || !manualPay.amount) return alert('Customer and amount required');
    await supabase.from('payments').insert({ customer_id:manualPay.customerId, vehicle_id:manualPay.vehicleId||null, amount:Number(manualPay.amount), method:manualPay.method, notes:manualPay.notes||'' });
    const { data: snap } = await supabase.from('customers').select('*').eq('id', manualPay.customerId).maybeSingle();
    if(snap) await supabase.from('customers').update({ balance_remaining: (snap.balance_remaining||0) - Number(manualPay.amount) }).eq('id', manualPay.customerId);
    alert('Payment recorded');
    setManualPay({customerId:'',vehicleId:'',amount:'',method:'Cash',notes:''});
  };

  const markHandled = async (id) => {
    await supabase.from('staff_alerts').update({ seen:true }).eq('id', id);
    const { data: a } = await supabase.from('staff_alerts').select('*').order('date',{ascending:false});
    setAlerts(a||[]);
  };

  return e('div',null,
    e('div',{className:'card'}, e('h3',null,'Inventory Manager'),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Make', value:form.make, onChange:ev=>setForm({...form,make:ev.target.value})}), e('input',{className:'half', placeholder:'Model', value:form.model, onChange:ev=>setForm({...form,model:ev.target.value})})),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Year', value:form.year, onChange:ev=>setForm({...form,year:ev.target.value})}), e('input',{className:'half', placeholder:'Seats (optional)', value:form.seats, onChange:ev=>setForm({...form,seats:ev.target.value})})),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Retail price', value:form.price, onChange:ev=>setForm({...form,price:ev.target.value})}), e('input',{className:'half', placeholder:'Down payment', value:form.downPayment, onChange:ev=>setForm({...form,downPayment:ev.target.value})})),
      e('input',{placeholder:'Primary image URL', value:form.imageUrl, onChange:ev=>setForm({...form,imageUrl:ev.target.value})}),
      e('textarea',{placeholder:'Maintenance & costs (comma separated)', value:form.maintenance, onChange:ev=>setForm({...form,maintenance:ev.target.value})}),
      e('div',{className:'small'}, 'Est monthly (96): $' + calcMonthly(form.price || 0, form.downPayment || 0)),
      e('div',null, e('button',{className:'btn', onClick:addVehicle}, 'Add Vehicle'))
    ),
    e('div',{id:'customers-main', className:'card'}, e('h3',null,'Customers'), e('button',{className:'btn', onClick:addCustomer}, 'Add Customer'),
      customers.length === 0 ? e('div',null,'No customers yet') : customers.map(c => e('div',{key:c.id, style:{padding:8,border:'1px solid #eee',borderRadius:6,marginTop:6}},
        e('div',{style:{fontWeight:'bold'}}, c.name + ' (ID: ' + c.id + ')'),
        e('div',null,'Balance: ' + currency(c.balance_remaining||0)),
        e('div',null,'Pickup Note: ' + (c.pickup_note ? ('$' + c.pickup_note.amount + ' due ' + new Date(c.pickup_note.dueDate).toLocaleDateString()) : 'None')),
        e('div',null,'Insurance: ' + (c.insurance && c.insurance.company ? (c.insurance.company + ' / ' + c.insurance.coverage) : 'None'))
      ))
    ),
    e('div',{className:'card'}, e('h3',null,'Payments'),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Customer ID', value:manualPay.customerId, onChange:ev=>setManualPay({...manualPay,customerId:ev.target.value})}), e('input',{className:'half', placeholder:'Vehicle ID', value:manualPay.vehicleId, onChange:ev=>setManualPay({...manualPay,vehicleId:ev.target.value})})),
      e('div',{className:'row'}, e('input',{className:'half', placeholder:'Amount', value:manualPay.amount, onChange:ev=>setManualPay({...manualPay,amount:ev.target.value})}), e('select',{className:'half', value:manualPay.method, onChange:ev=>setManualPay({...manualPay,method:ev.target.value})}, e('option',{value:'Cash'}, 'Cash'), e('option',{value:'Card'}, 'Card'), e('option',{value:'Phone'}, 'Phone'))),
      e('textarea',{placeholder:'Notes', value:manualPay.notes, onChange:ev=>setManualPay({...manualPay,notes:ev.target.value})}),
      e('div',null, e('button',{className:'btn', onClick:addManualPayment}, 'Record In-Person Payment'))
    ),
    e('div',{id:'alerts-main', className:'card'}, e('h3',null,'Alerts / Repo / Compliance'),
      e('div',null, e('button',{className:'btn', onClick:runInsuranceCheckNow}, 'Run Insurance Check Now (manual)')),
      alerts.length===0 ? e('div',null,'No alerts') : alerts.map(a => e('div',{key:a.id, className:'alert', style:{padding:8,border:'1px solid #eee',borderRadius:6,marginTop:6}},
        e('div',null, e('strong',null,a.type)),
        e('div',null,'Customer: ' + (a.customer_id || 'N/A')),
        e('div',null,'Details: ' + (a.details||'')),
        !a.seen ? e('div',null, e('button',{className:'btn', onClick:()=>markHandled(a.id)}, 'Mark Handled')) : e('div',null,'Handled')
      ))
    )
  );
}

function CustomerShell({customerId}){
  return e('div',null, e('div',{className:'content'}, e(CustomerPortal,{customerId})));
}

function CustomerPortal({customerId}){
  const [cust,setCust] = useState(null);
  const [calc, setCalc] = useState({retail:'',down:''});

  useEffect(()=>{
    const loadCustomer = async () => {
      if(!customerId) { setCust(null); return; }
      const { data } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
      setCust(data);
    };
    loadCustomer();
    const interval = setInterval(loadCustomer, 5000);
    return ()=>clearInterval(interval);
  },[customerId]);

  const updateInsurance = async (k, v) => {
    if(!customerId) return alert('No customer id');
    const { data: snap } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
    const cur = snap?.insurance || {};
    await supabase.from('customers').update({ insurance: { ...cur, [k]: v } }).eq('id', customerId);
    alert('Insurance saved');
  };

  return e('div',null,
    e('div',{className:'card'}, e('h3',null,'Customer Account'),
      !customerId ? e('div',null,'Enter your Customer ID in the top-right to load your account (staff can add customers in Staff Portal)') :
      cust ? e('div',null, e('div',null, e('strong',null,'Name: '), cust.name), e('div',null, e('strong',null,'Balance: '), currency(cust.balance_remaining||0)), e('div',null, e('strong',null,'Payment Plan: '), cust.payment_plan || 'semi-monthly'), e('div',null, e('strong',null,'Pickup Note: '), cust.pickup_note ? ('$' + cust.pickup_note.amount + ' due ' + new Date(cust.pickup_note.dueDate).toLocaleDateString()) : 'None') ) : e('div',null,'Customer not found')
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

async function seedSampleVehicles(){
  if(!confirm('This will add 50 sample vehicles to your database for testing. Proceed?')) return;
  const makes = ['Ford','Chevrolet','Toyota','Nissan','Honda','Dodge','Jeep','GMC','Kia','Hyundai'];
  const models = ['Focus','Impala','Camry','Altima','Civic','Charger','Wrangler','Sierra','Soul','Elantra'];
  const imgs = [
    'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&q=80',
    'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&q=80'
  ];
  const batch = [];
  for(let i=0;i<50;i++){
    const make = makes[Math.floor(Math.random()*makes.length)];
    const model = models[Math.floor(Math.random()*models.length)];
    const price = Math.floor(2000 + Math.random()*22000);
    const down = Math.floor(200 + Math.random()*3000);
    batch.push({
      make, model, year: 2000 + Math.floor(Math.random()*25),
      price, down_payment: down, maintenance: 'Inspected, detailed', image_url: imgs[i % imgs.length],
      seats: 4 + Math.floor(Math.random()*3),
      sold: false
    });
  }
  await supabase.from('vehicles').insert(batch);
  alert('Added 50 sample vehicles. Reload to see them.');
}

window.seedSampleVehicles = seedSampleVehicles;

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
