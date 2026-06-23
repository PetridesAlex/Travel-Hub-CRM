export const CAPTURE_PROFILES = {
  individual: {
    id: 'individual',
    label: 'Individual',
    icon: 'user',
    clientType: 'individual',
    welcome:
      'Tell me about your individual client — first & last name, email, and phone. I’ll save them to your directory.',
    placeholder:
      'Save as individual: Alex Petrides, phone 97866884, email alexpetridesx@gmail.com',
    template:
      'First name:\nLast name:\nEmail:\nPhone:\nNotes:',
    example:
      'Please save as individual — Alex Petrides, contact number 97866884, email alexpetridesx@gmail.com',
    fields: ['First name & surname', 'Email', 'Phone', 'Notes (optional)'],
  },
  business: {
    id: 'business',
    label: 'Corporate',
    icon: 'building',
    clientType: 'business',
    welcome:
      'Tell me about the corporate account — company name, contact person, email, and phone.',
    placeholder:
      'Corporate: Acme Travel Ltd, contact Sarah Miller, sarah@acme.com, +357 99 123456',
    template:
      'Company name:\nContact person (first & last name):\nEmail:\nPhone:\nNotes:',
    example:
      'Add corporate client — company Horizon Events, contact John Kennedy, john@horizon.com, 99123456',
    fields: ['Company name', 'Contact person', 'Email', 'Phone', 'Notes (optional)'],
  },
  enquiry: {
    id: 'enquiry',
    label: 'Lead enquiry',
    icon: 'target',
    clientType: null,
    welcome:
      'Paste an enquiry — client details plus destination, dates, budget, and travellers. I’ll create the client and lead.',
    placeholder:
      'Maria Papadopou — Santorini 10–17 Aug, 2 adults, budget €4500, phone +357…, email maria@…',
    template:
      'Client name:\nEmail:\nPhone:\nDestination:\nTravel dates:\nBudget:\nTravellers:\nNotes:',
    example:
      'New lead: James Lee, james@company.com, wants Cyprus incentive trip September, budget around €6000, 12 pax',
    fields: ['Client contact', 'Destination', 'Dates', 'Budget', 'Travellers', 'Notes'],
  },
}

export function getCaptureProfile(mode, profileId) {
  if (mode === 'lead') return CAPTURE_PROFILES.enquiry
  return CAPTURE_PROFILES[profileId] || CAPTURE_PROFILES.individual
}
