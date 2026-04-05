/**
 * Knowledge base documents for seeding the AI assistant.
 * Separated from the seed script for maintainability.
 */
export const KNOWLEDGE_DOCUMENTS = [
  // =====================================================================
  // Building Rules & Regulations
  // =====================================================================
  {
    title: 'Building Rules & Regulations',
    category: 'building-rules',
    content: `# Building Rules and Regulations

## General Conduct
- Residents must maintain a respectful and peaceful environment for all neighbors.
- Noise levels must be kept to a minimum between 10:00 PM and 7:00 AM (quiet hours).
- Common areas (lobby, corridors, stairways, rooftop) must be kept clean and tidy.
- No smoking is permitted inside the building, including corridors, lifts, and common areas.
- Pets are allowed only with prior written approval from management. Pets must be kept on a leash in common areas.

## Apartment Use
- Apartments are for residential use only. Commercial activities are not permitted.
- Subletting requires written approval from management at least 30 days in advance.
- Modifications, renovations, or structural changes to the apartment are strictly prohibited without written approval.
- Residents are responsible for minor maintenance within their units (e.g., replacing light bulbs, fixing leaking taps).

## Building Access & Security
- All residents must have a valid access card to enter the building.
- Visitors must be registered at the reception desk and may not be left unattended.
- Lost access cards must be reported to management immediately. A replacement fee of 200,000 VND applies.
- Residents must not share access cards with non-residents.

## Parking
- Each apartment is entitled to one designated parking space.
- Double parking and unauthorized parking will result in the vehicle being towed at the owner's expense.
- Bicycles must be stored in designated bicycle racks only.

## Waste Disposal
- Waste must be separated into recyclable, organic, and general waste.
- Garbage must be placed in designated bins on each floor before 9:00 PM daily.
- Bulk waste (furniture, appliances) must be arranged with management in advance.
`,
  },
  {
    title: 'Fire Safety & Emergency Procedures',
    category: 'building-rules',
    content: `# Fire Safety & Emergency Procedures

## Fire Prevention
- Do not block fire exits or emergency stairways at any time.
- Flammable materials and chemicals may not be stored in apartments or parking areas.
- Barbecuing on balconies is strictly prohibited.
- Do not overload electrical outlets. Use certified power strips only.

## In Case of Fire
1. Activate the nearest fire alarm pull station.
2. Call emergency services immediately: 114 (fire), 115 (ambulance).
3. Alert neighboring units by knocking on doors as you evacuate.
4. Use stairways to evacuate — do NOT use elevators.
5. Proceed to the designated assembly point at the main building entrance.
6. Do not re-enter the building until authorized by fire department.

## Emergency Contacts
- Building Management: +84 28 1234 5678
- Security Desk (24/7): Extension 100
- Medical Emergency: 115
- Fire Department: 114
- Police: 113

## Evacuation Assembly Points
- Primary: Front car park area (main entrance)
- Secondary: Rear garden (service entrance side)
`,
  },

  // =====================================================================
  // Payment Policies
  // =====================================================================
  {
    title: 'Rent Payment Policy',
    category: 'payment-policy',
    content: `# Rent Payment Policy

## Payment Schedule
- Rent is due on the 1st of each month.
- A grace period of 5 days is provided (payment accepted until the 5th without penalty).
- Late payment after the 5th incurs a 1.5% monthly interest charge on the outstanding amount.

## Accepted Payment Methods
- Bank transfer to the designated building account.
- Online payment through the Vully resident portal (recommended).
- Cash payment at the management office (Monday–Friday, 8:00 AM – 5:00 PM).

## Bank Transfer Details
- Bank: Vietcombank
- Account Name: Vully Management Co., Ltd
- Account Number: 0123456789
- Branch: Ho Chi Minh City - District 1
- Reference: [Your Apartment Number] - [Month/Year] (e.g., A0502 - 04/2026)

## Security Deposit
- A security deposit equivalent to 2 months' rent is required upon signing the lease.
- The deposit is refunded within 30 days of lease termination, minus any outstanding balances or damages.

## Invoice Disputes
- Invoice disputes must be submitted within 7 days of issue.
- Contact management via the Vully portal or email at billing@vully.vn.
- Do not withhold rent while an invoice dispute is being resolved.

## Service Charges
Monthly service charges cover:
- Building maintenance and repairs
- Security (24/7)
- Common area cleaning
- Elevator maintenance
- Waste management
`,
  },
  {
    title: 'Utility Billing Policy',
    category: 'payment-policy',
    content: `# Utility Billing Policy

## Meter Reading Schedule
- Electricity and water meters are read on the last working day of each month.
- Residents may view their meter readings via the Vully portal under "Meter Readings".

## Electricity Rates
- Tier 1 (0–50 kWh): 1,728 VND/kWh
- Tier 2 (51–100 kWh): 1,786 VND/kWh
- Tier 3 (101–200 kWh): 2,074 VND/kWh
- Tier 4 (201–300 kWh): 2,612 VND/kWh
- Tier 5 (301–400 kWh): 2,919 VND/kWh
- Tier 6 (>400 kWh): 3,015 VND/kWh

## Water Rates
- Standard rate: 15,929 VND/m³
- Environmental protection fee: 10% surcharge
- VAT: 8%

## Internet & Cable TV
- Internet (100 Mbps fiber): 250,000 VND/month
- Cable TV: 150,000 VND/month

## Billing Disputes
- Meter reading disputes must be filed within 5 days of the invoice date.
- Building management will arrange a joint meter reading verification within 3 business days.
`,
  },

  // =====================================================================
  // FAQ
  // =====================================================================
  {
    title: 'Frequently Asked Questions (FAQ)',
    category: 'faq',
    content: `# Frequently Asked Questions

## General

**Q: How do I submit a maintenance request?**
A: Log in to the Vully portal, go to "Incidents", and click "New Incident". Provide a description and optionally attach a photo. Our maintenance team will contact you within 24 hours.

**Q: What are the management office hours?**
A: Monday to Friday: 8:00 AM – 5:30 PM. Saturday: 8:00 AM – 12:00 PM. Closed on Sundays and public holidays. The security desk is available 24/7.

**Q: How do I get a parking space?**
A: One parking space is assigned per apartments. Contact management if you need an additional space (subject to availability, extra fee applies).

**Q: Can I have a pet in my apartment?**
A: Yes, with prior written approval. Submit a pet registration form at the management office. Dogs and cats are allowed; exotic animals are not. A pet deposit may be required.

## Billing & Payments

**Q: I didn't receive my invoice. What should I do?**
A: Invoices are sent to your registered email and are available in the Vully portal under "Invoices". Check your spam folder too. If not found, contact billing@vully.vn.

**Q: Can I pay rent in installments?**
A: Rent must be paid in full by the due date. Installment arrangements are not standard but can be discussed with management in exceptional circumstances.

**Q: My electricity bill seems higher than usual. What could cause this?**
A: High electricity usage can result from faulty appliances (e.g., water heater leaks), leaving AC running continuously, or a malfunctioning meter. File a dispute via the portal and we'll arrange a meter check.

## Maintenance

**Q: What counts as tenant responsibility vs building responsibility?**
A: Tenants are responsible for: lightbulbs, minor plumbing (tap washers), appliance repairs. Building is responsible for: structural repairs, main plumbing, lift maintenance, common area upkeep, major electrical faults.

**Q: How urgent are maintenance responses?**
A: Emergency (e.g., flooding, no power): responded to within 2 hours.
  High priority (e.g., faulty lock, no hot water): within 24 hours.
  Normal (cosmetic, non-urgent): within 3–5 business days.

**Q: Is there a fee for maintenance work?**
A: Maintenance caused by normal wear and tear is free. Repairs due to tenant negligence or misuse will be charged to the tenant.
`,
  },
  {
    title: 'Move-in & Move-out FAQ',
    category: 'faq',
    content: `# Move-in & Move-out Guide

## Move-in

**Before moving in:**
- Complete lease signing and deposit payment.
- Collect access cards and parking sticker from the management office.
- Schedule a move-in inspection with management to document the apartment condition.
- Register your household members at the management office.

**Moving day:**
- Moves must be scheduled between 8:00 AM – 5:00 PM, Monday–Saturday.
- Use the service elevator (not the main lifts) for furniture.
- Protect corridor walls and floors with padding during the move.
- Notify management at least 48 hours in advance by calling or using the portal.

## Move-out

**Notice period:**
- Provide at least 30 days' written notice before moving out.
- Failure to give proper notice may result in forfeiture of the security deposit.

**Move-out checklist:**
- Return all access cards and keys.
- Remove all personal belongings.
- Clean the apartment thoroughly (professional cleaning may be deducted from deposit if not done).
- Repair any damage beyond normal wear and tear.
- Submit final meter readings via the portal.

**Security deposit refund:**
- Refunded within 30 days of handover, after deducting unpaid rent, utility balances, and repair costs.
- An itemized deduction statement will be provided.
`,
  },

  // =====================================================================
  // Maintenance Procedures
  // =====================================================================
  {
    title: 'Maintenance Request Procedures',
    category: 'maintenance',
    content: `# Maintenance Request Procedures

## How to Submit a Request
1. Log in to the Vully portal.
2. Navigate to "Incidents" > "New Incident".
3. Select the incident type (Plumbing, Electrical, HVAC, Structural, Other).
4. Provide a detailed description and upload photos if possible.
5. Select priority: Low, Medium, High, or Emergency.
6. Submit — you will receive an email confirmation with a ticket number.

## Priority Levels

### Emergency (respond within 2 hours)
- Total power outage in apartment
- Flooding or major water leak
- Gas leak (call 114 immediately)
- Lift entrapment
- Broken entry door or lock
- Fire damage

### High (respond within 24 hours)
- No hot water
- Air conditioning failure
- Faulty electrical socket (sparking or burning smell)
- Sewage backup
- Broken window

### Medium (respond within 3 business days)
- Leaking tap or toilet (slow drip)
- Flickering lights
- Damaged cabinet or fixture
- Pest infestation (initial report)

### Low (respond within 5 business days)
- Cosmetic repairs (painting, minor scratches)
- Non-functional decorative items
- Small tile cracks (non-structural)

## During the Maintenance Visit
- A technician will contact you to arrange a convenient time.
- Residents must be present (or provide access) during the visit.
- For emergency repairs, building staff may access the unit without prior notice.
- After work completion, a sign-off is required from the resident.

## Follow-up
- You can track your ticket status in the portal under "Incidents".
- If a request is not resolved within the stated timeframe, escalate via the portal or contact management directly.
`,
  },
  {
    title: 'Air Conditioning Maintenance Guide',
    category: 'maintenance',
    content: `# Air Conditioning Maintenance

## Tenant Responsibilities
- Clean the AC filter every 2–4 weeks (remove, rinse with water, dry, re-fit).
- Keep the area around indoor and outdoor units clear of obstructions.
- Do not set the thermostat below 18°C for extended periods (inefficient and prone to icing).
- Report unusual noises, water drips, or reduced cooling immediately.

## Scheduled Servicing
- Building-provided AC units are serviced once every 6 months.
- Servicing includes: coil cleaning, refrigerant level check, drainage cleaning, electrical inspection.
- Residents will be notified at least 3 days before scheduled servicing.

## Common Problems & Solutions

**AC not cooling adequately:**
1. Check that the filter is not clogged.
2. Ensure doors and windows are closed.
3. Check room temperature setting.
4. If problem persists, submit a maintenance request.

**Water dripping from indoor unit:**
- Usually caused by a blocked drainage pipe.
- Submit a Medium priority maintenance request.

**AC making loud noise:**
- Could indicate a loose component or debris in the fan.
- Submit a High priority request if noise is severe.

**AC won't turn on:**
- Check the circuit breaker in the electrical panel.
- Ensure the power socket is working (test with another device).
- Submit a High priority request if power is confirmed but unit doesn't start.
`,
  },
];
