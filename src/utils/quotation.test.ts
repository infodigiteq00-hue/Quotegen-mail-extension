import { describe, expect, it } from 'vitest';
import { parseEmailContent } from '@/utils/quotation';

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
});
