import { describe, expect, it } from 'vitest';
import { __testHooks, parseEmailContent, parseEmailContentSmart } from '@/utils/quotation';

const SAMPLE_EMAIL = `
Hi Team,

Please share your best quotation for below items for our plant expansion:

Heat Exchanger HX-02
Qty: 2 Nos
Approx Price: 48,500 USD per unit
MOC: SS316
Size: 1200 mm x 600 mm

Reactor Vessel - Unit A
Quantity: one
Expected Cost: around 125000 USD
MOC: Carbon Steel, epoxy coated
Design Code: ASME Sec VIII

PLC Control Panel
Need 3 units
Budget: 18,000 - 22,000 USD each
Specification: Siemens S7-1200 compatible

Industrial Flow Meter DN80
2 qty
price 7,250 USD
Type: electromagnetic

Also add 1 Air Receiver Tank
costing about 15,000 USD
capacity: 1000L

Delivery required within 4-5 weeks at Pune site.
Include installation + commissioning charges separately.
Freight and GST should be shown separately.
Warranty minimum 18 months from dispatch.

Please do not repeat brand alternatives right now; only equivalent specs accepted.
Contact person: Rohan Mehta
Company: Mehta Process Solutions Pvt Ltd
`;

describe('parseEmailContent', () => {
  it('parses all five products from mixed-format RFQ', () => {
    const result = parseEmailContent(SAMPLE_EMAIL);
    const names = result.parsed.map(p => p.name);

    expect(result.parsed).toHaveLength(5);
    expect(names).toContain('Heat Exchanger HX-02');
    expect(names).toContain('Reactor Vessel - Unit A');
    expect(names).toContain('PLC Control Panel');
    expect(names).toContain('Industrial Flow Meter DN80');
    expect(names).toContain('Air Receiver Tank');
    expect(names).not.toContain('ing');

    const plc = result.parsed.find(p => p.name === 'PLC Control Panel');
    expect(plc?.quantity).toBe(3);
    expect(plc?.unitPrice).toBe(22000);

    const tank = result.parsed.find(p => p.name === 'Air Receiver Tank');
    expect(tank?.quantity).toBe(1);
    expect(tank?.unitPrice).toBe(15000);
  });

  it('imports a product line that has a name but no qty/price (enquiry-style list)', () => {
    const result = parseEmailContent(
      'Stainless 316L Manifold Assembly\n' +
        'Custom Flange for process line B-12',
    );
    const names = result.parsed.map(p => p.name);
    expect(names).toContain('Stainless 316L Manifold Assembly');
    expect(names).toContain('Custom Flange for process line B-12');
  });

  it('does not treat cover-letter lines as products when they have no qty/price', () => {
    const result = parseEmailContent(
      'Please share your best quotation for the project.\n\nHeat Exchanger HX-02\nQty: 1\nPrice: 10 USD',
    );
    const names = result.parsed.map(p => p.name);
    expect(names).toContain('Heat Exchanger HX-02');
    expect(names).not.toContain('Please share your best quotation for the project.');
  });

  it('returns normalized extraction when n8n is unavailable (local fallback)', async () => {
    const result = await parseEmailContentSmart(
      'Stainless 316L Manifold Assembly\nCustom Flange for process line B-12',
    );
    expect(result.parsed.length).toBeGreaterThan(0);
    const manifold = result.parsed.find(p => p.name === 'Stainless 316L Manifold Assembly');
    expect(manifold).toBeDefined();
    expect(manifold?.quantity).toBe(1);
    expect(manifold?.unitPrice).toBe(0);
  });

  it('does not infer quantity from words like "max 9" or signature phone lines', () => {
    const result = parseEmailContent(`
Anyways we need some items for line-3 shutdown window (max 9 days).
PT100 temperature sensor, 6mm probe, 1.5m lead — qty 24
Random non-item stuff below (ignore please):
Rohan will share drawing rev-C tomorrow.
Regards,
Nilesh P.
Maintenance (Night Shift)
Mob: +91-9xxxxxx210
`);
    const names = result.parsed.map(p => p.name);
    expect(names).toContain('PT100 temperature sensor, 6mm probe, 1.5m lead');
    expect(names).not.toContain('Anyways we need some items for line-3 shutdown window (max 9 days).');
    expect(names).not.toContain('Mob: +91-9xxxxxx210');
    const pt100 = result.parsed.find(p => p.name.includes('PT100 temperature sensor'));
    expect(pt100?.quantity).toBe(24);
  });

  it('filters noisy narrative lines and keeps true products for mixed casual RFQ email', async () => {
    const email = `
Subject: Re: Urgent + Random Notes + RFQ maybe??

Hi Team,

First thing first, chai machine still dead lol.
Anyways we need some items for line-3 shutdown window (max 9 days).

Hydrotest Pump Skid (mobile type) — old vendor gave ~88,500 last time but don’t rely. Need 2 sets if budget allows.
SS flexible hose DN25 with camlock, maybe 12? hmm final karo 10 pcs.
Flameproof Junction Box 12-way, IP66 (Ex d)
PT100 temperature sensor, 6mm probe, 1.5m lead — qty 24
VFD Panel 7.5kW (ABB/Siemens equivalent) — target around ₹54,000 each, need 3
Air Receiver Tank 300L (vertical), pressure 10 bar
Inline Basket Strainer 2 inch, CS body — 4 nos
Dosing Pump 0-60 LPH, 6 bar (chemical line) — maybe one standby too, so do 2 units
Also include:
freight separate, GST extra, installation optional, delivery Vadodara plant gate-2.
Don’t include premium brands unless price gap <8%.

Random non-item stuff below (ignore please):
Rohan will share drawing rev-C tomorrow, and yes previous invoice mismatch is under review.
If possible quote in INR + lead time + warranty line.

Regards,
Nilesh P.
Maintenance (Night Shift)
Mob: +91-9xxxxxx210
`;

    const result = await parseEmailContentSmart(email);
    const names = result.parsed.map(p => p.name);
    expect(names.some(name => name.includes('Hydrotest Pump Skid'))).toBe(true);
    expect(names.some(name => name.includes('VFD Panel 7.5kW'))).toBe(true);
    expect(names.some(name => name.includes('First thing first'))).toBe(false);
    expect(names.some(name => name.includes('Don') && name.includes('premium brands'))).toBe(false);
    expect(names.some(name => name.includes('Rohan will share drawing'))).toBe(false);
    expect(names.some(name => name === 'Nilesh P.')).toBe(false);

    const vfd = result.parsed.find(p => p.name.includes('VFD Panel 7.5kW'));
    expect(vfd?.quantity).toBe(3);
    expect(vfd?.unitPrice).toBe(54000);
  });

  it('cleans product names and quantities for formal RFQ with mixed qualifiers', async () => {
    const email = `
Hello Procurement Team,
Please quote for the following items:

Sanitary Centrifugal Pump, 5 HP, SS316L, tri-clamp ends - we need 3 units.
Plate Heat Exchanger, 20 m² - quantity 1, target budget around USD 9,500.
SS Pipe spool 2" Sch40, around 18 m total (break into 6 lengths).
Food-grade Flexible Hose 1.5 inch with SS camlock - about 30 meters total; assume 6 lengths for now.
Inline Magnetic Trap, 2 inch - only 2 pieces.
Load Cell Kit (for 2-ton vessel) - not finalized, but include 4 sets in quote.
Control Panel (VFD based) for agitator motors - likely 2 panels, expected around ₹1,25,000 each.
Butterfly Valve, SS316, 2 inch - maybe 10 valves (final confirmation pending).
CIP Spray Ball, 1.5 inch - include 8 pcs.
Pressure Gauge 0–10 bar, glycerin filled, 20 pcs.
`;

    const result = await parseEmailContentSmart(email);
    const names = result.parsed.map(p => p.name);
    expect(names.some(name => /for the following items/i.test(name))).toBe(false);
    expect(names.some(name => /sorry late reply|random update first/i.test(name))).toBe(false);

    const panel = result.parsed.find(p => p.name.includes('Control Panel (VFD based)'));
    expect(panel?.quantity).toBe(2);
    expect(panel?.unitPrice).toBe(125000);
    expect(panel?.name.includes('target')).toBe(false);

    const valve = result.parsed.find(p => p.name.includes('Butterfly Valve'));
    expect(valve?.quantity).toBe(10);

    const spool = result.parsed.find(p => p.name.includes('SS Pipe spool'));
    expect(spool?.quantity).toBe(6);
    const noisyIncludeName = result.parsed.find(
      p => p.name.includes('Regulator') && p.name.toLowerCase().includes('include'),
    );
    expect(noisyIncludeName).toBeUndefined();

    const pressureGauge = result.parsed.find(p => p.name.includes('Pressure Gauge'));
    expect(pressureGauge?.quantity).toBe(20);
  });

  it('prefers keep/final quantity and avoids semicolon item merge', async () => {
    const email = `
Mono Pump 1.5 HP for slurry line — maybe 2, but keep 3 in quote if price okay.
Junction Box Ex d, 8-way — maybe 6 (final maybe 5) -> keep 5.
Flexible hose 1", food grade, 15m with TC ends — 3 lines; Pressure Gauge 0–10 bar, glycerin filled, 20 pcs.
`;
    const result = await parseEmailContentSmart(email);

    const mono = result.parsed.find(p => p.name.includes('Mono Pump'));
    expect(mono?.quantity).toBe(3);

    const jbox = result.parsed.find(p => p.name.includes('Junction Box'));
    expect(jbox?.quantity).toBe(5);

    const hose = result.parsed.find(p => p.name.includes('Flexible hose'));
    const gauge = result.parsed.find(p => p.name.includes('Pressure Gauge'));
    expect(hose?.quantity).toBe(3);
    expect(gauge?.quantity).toBe(20);
  });

  it('does not split hose continuation fragment as separate product', async () => {
    const email = `
Food-grade Flexible Hose 1.5 inch with SS camlock - about 30 meters total; assume 6 lengths for now.
`;
    const result = await parseEmailContentSmart(email);
    const hoseItems = result.parsed.filter(p => p.name.toLowerCase().includes('flexible hose'));
    expect(hoseItems).toHaveLength(1);
    expect(result.parsed.some(p => /meters total;?\s*assume/i.test(p.name))).toBe(false);
  });

  it('filters opener and signature lines in utilities-process RFQ format', async () => {
    const email = `
Quick ask before I forget: we need to close procurement for the weekend maintenance slot.
Not related: internet in admin block is down since morning.
For quotation please consider these items (mixed priority):

We need 3 diaphragm dosing pumps, 0–120 LPH, 5 bar, PP head.
Also quote 2 shell & tube heat exchangers (small), carbon steel body.
RTD PT100 probe 4mm with 2m cable, include 15 pcs.
Air compressor service kit for model AX-22, 2 kits.

Ignore below (non-item): Rakesh will share revised P&ID tomorrow.
Regards,
Priya S
`;
    const result = await parseEmailContentSmart(email);
    const names = result.parsed.map(p => p.name);
    expect(names.some(n => n.toLowerCase().includes('quick ask'))).toBe(false);
    expect(names.some(n => n.toLowerCase().includes('not related'))).toBe(false);
    expect(names.some(n => n.toLowerCase().includes('for quotation please consider'))).toBe(false);
    expect(names.some(n => n === 'Priya S')).toBe(false);
    const compressorKit = result.parsed.find(p => p.name.includes('Air compressor service kit'));
    expect(compressorKit).toBeDefined();
  });

  it('removes professional header and contact lines from extracted products', async () => {
    const email = `
Dear Sales Team,
We request your best quotation for the following items required for our Utility Upgrade project:
submit your best quote for the following materials required during our Phase-2 shutdown at the Vadodara plant

Centrifugal Pump, 3 HP, SS316, 2900 RPM - Quantity: 2 Nos
Shell & Tube Heat Exchanger, CS Body, 15 m² - Quantity: 1 No
RTD PT100 Sensor, 6 mm x 150 mm, with thermowell - Quantity: 12 Nos

Best regards,
Nikita Shah
nikita.shah@apexprocess.in
+91-79-4XXXXXXX
`;
    const result = await parseEmailContentSmart(email);
    const names = result.parsed.map(p => p.name.toLowerCase());
    expect(names.some(n => n.includes('we request your best quotation'))).toBe(false);
    expect(names.some(n => n.includes('submit your best quote'))).toBe(false);
    expect(names.some(n => n.includes('@apexprocess'))).toBe(false);
    expect(names.some(n => n.includes('+91-79'))).toBe(false);
    expect(result.parsed.length).toBeGreaterThanOrEqual(3);
  });

  it('drops commercial requirements line and keeps qty from "Qty: 10 Lengths"', async () => {
    const email = `
Progressive Cavity Pump, 2 HP, SS304 wetted parts - Qty: 2 Nos
Flexible Hose, 1.5 inch, SS braided, 2.5 m each - Qty: 10 Lengths
Commercial requirements
Material test certificates, where applicable
`;
    const result = await parseEmailContentSmart(email);
    const names = result.parsed.map(p => p.name.toLowerCase());
    expect(names.some(n => n.includes('commercial requirements'))).toBe(false);
    const hose = result.parsed.find(p => p.name.includes('Flexible Hose'));
    expect(hose?.quantity).toBe(10);
  });

  it('keeps quantity when product and qty are split across lines', async () => {
    const email = `
Flexible Hose, 1.5 inch, SS braided, 2.5 m each
Qty: 10 Lengths
`;
    const result = await parseEmailContentSmart(email);
    const hose = result.parsed.find(p => p.name.toLowerCase().includes('flexible hose'));
    expect(hose?.quantity).toBe(10);
  });

  it('reconciles weak AI qty with deterministic qty signal', () => {
    const aiParsed = [
      {
        name: 'Flexible Hose, 1.5 inch, SS braided, 2.5 m',
        quantity: 1,
        unitPrice: 0,
        description: '',
        raw: 'Flexible Hose, 1.5 inch, SS braided, 2.5 m',
        confident: true,
      },
    ];
    const deterministic = [
      {
        name: 'Flexible Hose, 1.5 inch, SS braided, 2.5 m',
        quantity: 10,
        unitPrice: 0,
        description: '',
        raw: 'Flexible Hose, 1.5 inch, SS braided, 2.5 m each - Qty: 10 Lengths',
        confident: true,
      },
    ];
    const merged = __testHooks.reconcileWithDeterministicSignals(aiParsed, deterministic);
    expect(merged[0]?.quantity).toBe(10);
  });

  it('infers qty from nearby source lines for same product', () => {
    const email = `
Progressive Cavity Pump, 2 HP, SS304 wetted parts - Qty: 2 Nos
Flexible Hose, 1.5 inch, SS braided, 2.5 m
Qty: 10 Lengths
`;
    const inferred = __testHooks.inferQtyFromSourceContext(
      'Flexible Hose, 1.5 inch, SS braided, 2.5 m',
      email,
    );
    expect(inferred).toBe(10);
  });
});
