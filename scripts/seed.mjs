#!/usr/bin/env node
/**
 * 🏛️ CivicPortal Database Seeder
 *
 * Seeds all required data into the Civic Complaint System:
 * - Admin account (admin@city.gov / Admin@1234)
 * - 5 Departments & 5 Officers (Officer@1234)
 * - 3 Citizens (Citizen@1234)
 * - 12 realistic complaints across all categories, priorities, and statuses
 * - Complete audit history, officer comments, SLA tracking, and duplicate detection
 *
 * Usage:
 *    node scripts/seed.mjs
 *    bun scripts/seed.mjs
 *    npm run seed (from frontend)
 */

const BASE = process.env.API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, ok: res.ok, data };
}

async function post(path, body, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(path, { method: 'POST', body: JSON.stringify(body), headers });
}

async function patch(path, body, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(path, { method: 'PATCH', body: JSON.stringify(body), headers });
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`  🏛️  CIVICPORTAL DATABASE SEEDER`);
  console.log(`  Connecting to API at: ${BASE}`);
  console.log(`======================================================\n`);

  // 1. Wait for backend to be ready
  let attempts = 0;
  while (attempts < 10) {
    try {
      const health = await request('/health');
      if (health.ok) break;
    } catch (err) {}
    attempts++;
    console.log(`Waiting for backend server at ${BASE}... (attempt ${attempts}/10)`);
    await new Promise((r) => setTimeout(r, 1500));
  }

  const healthCheck = await request('/health');
  if (!healthCheck.ok) {
    console.error(`\n❌ Error: Cannot connect to backend at ${BASE}.`);
    console.error(`Please ensure Docker or backend server is running:`);
    console.error(`  docker compose up -d\n`);
    process.exit(1);
  }
  console.log(`✓ Backend is healthy.`);

  // 2. Bootstrap / Login Admin
  console.log(`\n--- 1. Setting Up Admin Account ---`);
  let adminRes = await post('/auth/bootstrap-admin', {
    name: 'Chief Administrator',
    email: 'admin@city.gov',
    password: 'Admin@1234',
  });

  let adminToken = adminRes.data?.access_token;
  if (!adminToken) {
    // Admin was already bootstrapped, log in
    const loginRes = await post('/auth/login', {
      email: 'admin@city.gov',
      password: 'Admin@1234',
    });
    adminToken = loginRes.data?.access_token;
  }

  if (!adminToken) {
    console.error(`❌ Could not acquire admin token. Verify credentials.`);
    process.exit(1);
  }
  console.log(`✓ Admin ready: admin@city.gov / Admin@1234`);

  // 3. Register Citizens
  console.log(`\n--- 2. Setting Up Citizens ---`);
  const citizens = [
    { name: 'Alex Rivera', email: 'citizen@example.com', password: 'Citizen@1234' },
    { name: 'Jane Smith', email: 'jane@example.com', password: 'Citizen@1234' },
    { name: 'Carlos Mendoza', email: 'carlos@example.com', password: 'Citizen@1234' },
  ];

  const citizenTokens = {};
  for (const c of citizens) {
    let reg = await post('/auth/register', { ...c, role: 'citizen' });
    let token = reg.data?.access_token;
    if (!token) {
      const log = await post('/auth/login', { email: c.email, password: c.password });
      token = log.data?.access_token;
    }
    citizenTokens[c.email] = token;
    console.log(`✓ Citizen ready: ${c.email} / ${c.password}`);
  }

  // 4. Register Officers
  console.log(`\n--- 3. Setting Up Department Officers ---`);
  const officers = [
    { name: 'Officer Sarah Chen', email: 'officer.electrical@city.gov', dept: 'Electrical Maintenance' },
    { name: 'Officer Marcus Vance', email: 'officer.roads@city.gov', dept: 'Roads & Public Works' },
    { name: 'Officer Priya Patel', email: 'officer.sanitation@city.gov', dept: 'Sanitation Department' },
    { name: 'Officer David Kim', email: 'officer.water@city.gov', dept: 'Water Board' },
    { name: 'Officer Elena Rostova', email: 'officer.general@city.gov', dept: 'General Services' },
  ];

  const officerTokens = {};
  for (const off of officers) {
    let reg = await post('/auth/register', {
      name: off.name,
      email: off.email,
      password: 'Officer@1234',
      role: 'officer',
      department: off.dept,
    });
    let token = reg.data?.access_token;
    if (!token) {
      const log = await post('/auth/login', { email: off.email, password: 'Officer@1234' });
      token = log.data?.access_token;
    }
    officerTokens[off.dept] = token;
    console.log(`✓ Officer ready: ${off.email} / Officer@1234 (${off.dept})`);
  }

  // 5. Submit & Process Seed Complaints
  console.log(`\n--- 4. Seeding Realistic Complaints Across Roles ---`);
  const complaints = [
    // 1. Streetlight (Critical / In Progress)
    {
      category: 'streetlight',
      description: 'Exposed live electrical wires dangling from damaged street light pole near school gate. Extreme electrocution danger for children walking home.',
      address_text: '45 Elm Street, Gate 3, Sector 4',
      location: { lat: 40.7128, lng: -74.0060 },
      token: citizenTokens['citizen@example.com'],
      dept: 'Electrical Maintenance',
      targetStatus: 'In Progress',
      officerComment: 'Emergency repair team on site. Power isolated to prevent electrocution hazard.',
    },
    // 2. Streetlight (High / Assigned - Aging)
    {
      category: 'streetlight',
      description: 'Streetlight on North Boulevard completely dark for over a week. Multiple vehicles had near misses with pedestrians at night.',
      address_text: 'North Blvd near 5th Crossing',
      location: { lat: 40.7130, lng: -74.0062 },
      token: citizenTokens['jane@example.com'],
      dept: 'Electrical Maintenance',
      targetStatus: 'Assigned',
    },
    // 3. Pothole (Critical / In Progress)
    {
      category: 'pothole',
      description: 'Massive crater pothole on expressway off-ramp. Two cars had blown tires today and sudden braking nearly caused multi-car pileup.',
      address_text: '120 Main Blvd near North Junction',
      location: { lat: 40.7150, lng: -74.0020 },
      token: citizenTokens['carlos@example.com'],
      dept: 'Roads & Public Works',
      targetStatus: 'In Progress',
      officerComment: 'Traffic warning cones placed. Road crew scheduled for asphalt repair.',
    },
    // 4. Pothole (Duplicate Root)
    {
      category: 'pothole',
      description: 'Deep asphalt trench across lane outside Metro Station exit 2 damaging suspension.',
      address_text: 'Metro Station Exit 2, Station Road',
      location: { lat: 40.7152, lng: -74.0022 },
      token: citizenTokens['citizen@example.com'],
      dept: 'Roads & Public Works',
      targetStatus: 'Assigned',
    },
    // 5. Pothole (Duplicate Trigger)
    {
      category: 'pothole',
      description: 'Severe road hole right outside Metro Station exit 2 entrance. Broken pavement makes it hard for traffic.',
      address_text: 'Station Road at Metro Entrance 2',
      location: { lat: 40.7153, lng: -74.0023 },
      token: citizenTokens['jane@example.com'],
      dept: 'Roads & Public Works',
      targetStatus: 'Assigned',
    },
    // 6. Garbage (Resolved)
    {
      category: 'garbage',
      description: 'Overflowing waste bins outside Community Center on 8th Ave. Bags ripped open, rotten food smell.',
      address_text: 'Corner of 8th Ave and Oak St',
      location: { lat: 40.7180, lng: -74.0090 },
      token: citizenTokens['jane@example.com'],
      dept: 'Sanitation Department',
      targetStatus: 'Resolved',
      officerComment: 'Sanitation Truck #4 collected all waste. Area disinfected.',
    },
    // 7. Garbage (New / Unassigned)
    {
      category: 'garbage',
      description: 'Illegal dumping of demolition debris, concrete, and broken tiles on sidewalk during the night.',
      address_text: 'Adjacent to 215 8th Avenue',
      location: { lat: 40.7185, lng: -74.0095 },
      token: citizenTokens['carlos@example.com'],
      targetStatus: 'New',
    },
    // 8. Water Supply (In Progress)
    {
      category: 'water_supply',
      description: 'Underground potable water main burst. Clean water gushing into the road and neighborhood has zero water pressure since morning.',
      address_text: '72 Pine Road near Water Reservoir',
      location: { lat: 40.7220, lng: -74.0040 },
      token: citizenTokens['citizen@example.com'],
      dept: 'Water Board',
      targetStatus: 'In Progress',
      officerComment: 'Pressure isolation valve closed. Trenching underway to replace broken pipe segment.',
    },
    // 9. Water Supply (Aging / Assigned)
    {
      category: 'water_supply',
      description: 'Contaminated brownish muddy water coming through domestic taps for past 4 days. Unfit for drinking or cooking.',
      address_text: 'Block C, Green Terrace Apartments',
      location: { lat: 40.7225, lng: -74.0045 },
      token: citizenTokens['jane@example.com'],
      dept: 'Water Board',
      targetStatus: 'Assigned',
    },
    // 10. Other (New / Unassigned)
    {
      category: 'other',
      description: 'Massive broken oak tree bough cracked and hanging dangerously over the public sidewalk following high winds.',
      address_text: 'City Central Park, West Entrance Pathway',
      location: { lat: 40.7250, lng: -74.0080 },
      token: citizenTokens['carlos@example.com'],
      targetStatus: 'New',
    },
    // 11. Other (Resolved)
    {
      category: 'other',
      description: 'Unauthorized wooden vendor stall obstructing the handicap wheelchair ramp near municipal market.',
      address_text: 'Municipal Market Entrance Gate 1',
      location: { lat: 40.7245, lng: -74.0075 },
      token: citizenTokens['citizen@example.com'],
      dept: 'General Services',
      targetStatus: 'Resolved',
      officerComment: 'Encroachment removed. Wheelchair ramp cleared and restored for public access.',
    },
    // 12. Pothole (Resolved)
    {
      category: 'pothole',
      description: 'Cracked road pavement and surface depression near pedestrian zebra crossing.',
      address_text: 'Intersection of 3rd Street and Maple Ave',
      location: { lat: 40.7160, lng: -74.0030 },
      token: citizenTokens['jane@example.com'],
      dept: 'Roads & Public Works',
      targetStatus: 'Resolved',
      officerComment: 'Asphalt cold patch applied and roller compacted.',
    },
  ];

  for (const c of complaints) {
    const sub = await post(
      '/complaints',
      {
        category: c.category,
        description: c.description,
        address_text: c.address_text,
        location: c.location,
      },
      c.token
    );

    if (!sub.ok || !sub.data?.id) {
      console.error(`  ✕ Failed to submit complaint (${c.category}):`, sub.data);
      continue;
    }

    const id = sub.data.id;
    const cid = sub.data.complaint_id;
    console.log(`  + Submitted #${cid} [${c.category.toUpperCase()}] (${sub.data.priority_label} Priority)`);

    // Assign if requested
    if (c.dept && c.targetStatus !== 'New') {
      await patch(`/complaints/${id}/assign`, { department: c.dept }, adminToken);

      // Advance status
      const offToken = officerTokens[c.dept];
      if (offToken) {
        if (c.targetStatus === 'In Progress' || c.targetStatus === 'Resolved') {
          await patch(`/complaints/${id}/status`, { status: 'In Progress' }, offToken);
          if (c.officerComment) {
            await post(`/complaints/${id}/comments`, { message: c.officerComment }, offToken);
          }
        }
        if (c.targetStatus === 'Resolved') {
          await patch(`/complaints/${id}/status`, { status: 'Resolved' }, offToken);
        }
      }
      console.log(`    ↳ Assigned to ${c.dept} -> Status: ${c.targetStatus}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`  🎉 SEEDING COMPLETE! ALL SYSTEMS OPERATIONAL`);
  console.log(`======================================================`);
  console.log(`\nYou can now log in with any of these accounts at http://localhost:5173/login :\n`);
  console.log(`👑 ADMIN:`);
  console.log(`   admin@city.gov                      / Admin@1234\n`);
  console.log(`👷 OFFICERS:`);
  console.log(`   officer.electrical@city.gov         / Officer@1234  (Electrical Maintenance)`);
  console.log(`   officer.roads@city.gov              / Officer@1234  (Roads & Public Works)`);
  console.log(`   officer.sanitation@city.gov         / Officer@1234  (Sanitation Department)`);
  console.log(`   officer.water@city.gov              / Officer@1234  (Water Board)`);
  console.log(`   officer.general@city.gov            / Officer@1234  (General Services)\n`);
  console.log(`🧑‍💼 CITIZENS:`);
  console.log(`   citizen@example.com                 / Citizen@1234  (Alex Rivera)`);
  console.log(`   jane@example.com                    / Citizen@1234  (Jane Smith)`);
  console.log(`   carlos@example.com                  / Citizen@1234  (Carlos Mendoza)\n`);
}

main().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
