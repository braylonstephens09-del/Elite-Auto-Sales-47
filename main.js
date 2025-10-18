import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let currentView = 'public';

const viewSelector = document.getElementById('viewSelector');
const publicView = document.getElementById('publicView');
const staffView = document.getElementById('staffView');
const customerView = document.getElementById('customerView');

viewSelector.addEventListener('change', (e) => {
  currentView = e.target.value;
  renderCurrentView();
});

function renderCurrentView() {
  publicView.classList.add('hidden');
  staffView.classList.add('hidden');
  customerView.classList.add('hidden');

  if (currentView === 'public') {
    publicView.classList.remove('hidden');
    renderPublicView();
  } else if (currentView === 'staff') {
    staffView.classList.remove('hidden');
    renderStaffView();
  } else if (currentView === 'customer') {
    customerView.classList.remove('hidden');
    renderCustomerView();
  }
}

async function renderPublicView() {
  publicView.innerHTML = `
    <div class="card">
      <h2>Available Vehicles</h2>
      <p style="color: #718096; margin-bottom: 16px;">Buy Here Pay Here - In-house financing available</p>
      <div class="row">
        <input type="text" id="searchInput" placeholder="Search by make or model..." />
        <button class="btn" onclick="window.loadVehicles()">Search</button>
      </div>
    </div>
    <div id="vehicleGrid" class="grid">
      <div class="loading">Loading vehicles...</div>
    </div>
  `;

  await loadVehicles();
}

async function loadVehicles() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput?.value.toLowerCase() || '';

  const vehicleGrid = document.getElementById('vehicleGrid');
  vehicleGrid.innerHTML = '<div class="loading">Loading vehicles...</div>';

  try {
    let query = supabase
      .from('vehicles')
      .select('*')
      .eq('sold', false)
      .order('created_at', { ascending: false });

    const { data: vehicles, error } = await query;

    if (error) throw error;

    let filteredVehicles = vehicles || [];
    if (searchTerm) {
      filteredVehicles = filteredVehicles.filter(v =>
        (v.make?.toLowerCase().includes(searchTerm) ||
         v.model?.toLowerCase().includes(searchTerm))
      );
    }

    if (filteredVehicles.length === 0) {
      vehicleGrid.innerHTML = '<div class="loading">No vehicles found. Staff can add vehicles from the Staff Portal.</div>';
      return;
    }

    vehicleGrid.innerHTML = filteredVehicles.map(vehicle => `
      <div class="vehicle-card" onclick="window.showVehicleDetails('${vehicle.id}')">
        <img src="${vehicle.image_url || 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=600'}"
             alt="${vehicle.make} ${vehicle.model}"
             class="vehicle-image">
        <div class="vehicle-info">
          <div class="vehicle-title">${vehicle.year || ''} ${vehicle.make} ${vehicle.model}</div>
          <div class="vehicle-price">$${vehicle.price?.toLocaleString()}</div>
          <div class="vehicle-details">Down: $${vehicle.down_payment?.toLocaleString() || 0}</div>
          <div class="vehicle-details">Est. Monthly: $${calculateMonthly(vehicle.price, vehicle.down_payment)}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    vehicleGrid.innerHTML = `<div class="error">Error loading vehicles: ${error.message}</div>`;
  }
}

function calculateMonthly(price, downPayment) {
  const financed = (price || 0) - (downPayment || 0);
  const monthly = financed / 96;
  return monthly.toFixed(2);
}

async function showVehicleDetails(vehicleId) {
  try {
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .maybeSingle();

    if (error) throw error;
    if (!vehicle) throw new Error('Vehicle not found');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${vehicle.year || ''} ${vehicle.make} ${vehicle.model}</h2>
          <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <img src="${vehicle.image_url || 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=1200'}"
             alt="${vehicle.make} ${vehicle.model}"
             style="width: 100%; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div>
            <strong>Price:</strong> $${vehicle.price?.toLocaleString()}
          </div>
          <div>
            <strong>Down Payment:</strong> $${vehicle.down_payment?.toLocaleString() || 0}
          </div>
          <div>
            <strong>Year:</strong> ${vehicle.year || 'N/A'}
          </div>
          <div>
            <strong>Seats:</strong> ${vehicle.seats || 'N/A'}
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Maintenance History:</strong>
          <p style="color: #718096; margin-top: 8px;">${vehicle.maintenance || 'No maintenance records available'}</p>
        </div>
        <div style="background: #f7fafc; padding: 16px; border-radius: 8px;">
          <strong>Financing Estimate (96 payments):</strong>
          <div style="font-size: 24px; color: #667eea; font-weight: 700; margin-top: 8px;">
            $${calculateMonthly(vehicle.price, vehicle.down_payment)} / month
          </div>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  } catch (error) {
    alert('Error loading vehicle details: ' + error.message);
  }
}

async function renderStaffView() {
  staffView.innerHTML = `
    <div class="card">
      <h2>Staff Portal</h2>
      <p style="color: #718096; margin-bottom: 20px;">Manage inventory and customers</p>

      <h3>Add New Vehicle</h3>
      <div class="row">
        <input type="text" id="staffMake" placeholder="Make" class="col" />
        <input type="text" id="staffModel" placeholder="Model" class="col" />
        <input type="number" id="staffYear" placeholder="Year" class="col" />
      </div>
      <div class="row">
        <input type="number" id="staffPrice" placeholder="Price" class="col" />
        <input type="number" id="staffDown" placeholder="Down Payment" class="col" />
        <input type="number" id="staffSeats" placeholder="Seats" class="col" />
      </div>
      <input type="url" id="staffImageUrl" placeholder="Image URL (optional)" />
      <textarea id="staffMaintenance" placeholder="Maintenance history..." rows="3"></textarea>
      <button class="btn" onclick="window.addVehicle()">Add Vehicle</button>

      <div id="staffMessage" style="margin-top: 16px;"></div>
    </div>

    <div class="card">
      <h3>Current Inventory</h3>
      <div id="staffInventory">
        <div class="loading">Loading inventory...</div>
      </div>
    </div>
  `;

  await loadStaffInventory();
}

async function loadStaffInventory() {
  const staffInventory = document.getElementById('staffInventory');

  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!vehicles || vehicles.length === 0) {
      staffInventory.innerHTML = '<p style="color: #718096;">No vehicles in inventory</p>';
      return;
    }

    staffInventory.innerHTML = vehicles.map(v => `
      <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <strong>${v.year || ''} ${v.make} ${v.model}</strong>
            <div style="color: #718096; font-size: 14px;">
              Price: $${v.price?.toLocaleString()} | Down: $${v.down_payment?.toLocaleString() || 0}
              ${v.sold ? ' | <span style="color: #e53e3e;">SOLD</span>' : ''}
            </div>
          </div>
          <button class="btn btn-secondary" onclick="window.toggleSold('${v.id}', ${v.sold})" style="padding: 6px 12px;">
            ${v.sold ? 'Mark Available' : 'Mark Sold'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    staffInventory.innerHTML = `<div class="error">Error loading inventory: ${error.message}</div>`;
  }
}

async function addVehicle() {
  const make = document.getElementById('staffMake').value;
  const model = document.getElementById('staffModel').value;
  const year = document.getElementById('staffYear').value;
  const price = document.getElementById('staffPrice').value;
  const downPayment = document.getElementById('staffDown').value;
  const seats = document.getElementById('staffSeats').value;
  const imageUrl = document.getElementById('staffImageUrl').value;
  const maintenance = document.getElementById('staffMaintenance').value;
  const staffMessage = document.getElementById('staffMessage');

  if (!make || !model || !price) {
    staffMessage.innerHTML = '<div class="error">Please fill in Make, Model, and Price</div>';
    return;
  }

  try {
    const { error } = await supabase
      .from('vehicles')
      .insert([{
        make,
        model,
        year: year ? parseInt(year) : null,
        price: parseFloat(price),
        down_payment: downPayment ? parseFloat(downPayment) : 0,
        seats: seats ? parseInt(seats) : null,
        image_url: imageUrl || null,
        maintenance: maintenance || null,
        sold: false
      }]);

    if (error) throw error;

    staffMessage.innerHTML = '<div class="success">Vehicle added successfully!</div>';

    document.getElementById('staffMake').value = '';
    document.getElementById('staffModel').value = '';
    document.getElementById('staffYear').value = '';
    document.getElementById('staffPrice').value = '';
    document.getElementById('staffDown').value = '';
    document.getElementById('staffSeats').value = '';
    document.getElementById('staffImageUrl').value = '';
    document.getElementById('staffMaintenance').value = '';

    await loadStaffInventory();

    setTimeout(() => {
      staffMessage.innerHTML = '';
    }, 3000);
  } catch (error) {
    staffMessage.innerHTML = `<div class="error">Error adding vehicle: ${error.message}</div>`;
  }
}

async function toggleSold(vehicleId, currentStatus) {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ sold: !currentStatus })
      .eq('id', vehicleId);

    if (error) throw error;

    await loadStaffInventory();
  } catch (error) {
    alert('Error updating vehicle: ' + error.message);
  }
}

async function renderCustomerView() {
  customerView.innerHTML = `
    <div class="card">
      <h2>Customer Portal</h2>
      <p style="color: #718096; margin-bottom: 20px;">Manage your account and view purchase details</p>

      <div class="row">
        <input type="text" id="customerId" placeholder="Enter your Customer ID" class="col" />
        <button class="btn" onclick="window.loadCustomerData()">Load Account</button>
      </div>

      <div id="customerData"></div>
    </div>
  `;
}

async function loadCustomerData() {
  const customerId = document.getElementById('customerId').value;
  const customerData = document.getElementById('customerData');

  if (!customerId) {
    customerData.innerHTML = '<div class="error">Please enter a Customer ID</div>';
    return;
  }

  customerData.innerHTML = '<div class="loading">Loading customer data...</div>';

  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw error;

    if (!customer) {
      customerData.innerHTML = '<div class="error">Customer not found</div>';
      return;
    }

    customerData.innerHTML = `
      <div style="margin-top: 24px; padding: 20px; background: #f7fafc; border-radius: 8px;">
        <h3 style="margin-bottom: 16px;">Account Information</h3>
        <div style="display: grid; gap: 12px;">
          <div><strong>Name:</strong> ${customer.name}</div>
          <div><strong>Email:</strong> ${customer.email || 'Not provided'}</div>
          <div><strong>Phone:</strong> ${customer.phone || 'Not provided'}</div>
          <div><strong>Balance Remaining:</strong> <span style="color: #667eea; font-weight: 700;">$${customer.balance_remaining?.toLocaleString() || 0}</span></div>
        </div>
      </div>
    `;
  } catch (error) {
    customerData.innerHTML = `<div class="error">Error loading customer data: ${error.message}</div>`;
  }
}

window.loadVehicles = loadVehicles;
window.showVehicleDetails = showVehicleDetails;
window.addVehicle = addVehicle;
window.toggleSold = toggleSold;
window.loadCustomerData = loadCustomerData;

renderCurrentView();
