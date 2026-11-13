// ==============================================================================
// WINDOW COMPANIES CRM — BULK IMPORT CATEGORY FIELD DEFINITIONS
// ==============================================================================

import { ImportCategory, ColumnDefinition } from '../types/bulkImport';

export interface CategoryMetadata {
  id: ImportCategory;
  title: string;
  shortDescription: string;
  parentEntityHint?: string;
  columns: ColumnDefinition[];
  sampleRows: Record<string, string>[];
}

export const CATEGORY_DEFINITIONS: Record<ImportCategory, CategoryMetadata> = {
  HOTELS: {
    id: 'HOTELS',
    title: 'Hotels',
    shortDescription: 'Partner hotel inventory managed by Window Companies.',
    columns: [
      {
        key: 'hotel_name',
        label: 'Hotel Name',
        required: true,
        aliases: ['hotel name', 'hotel', 'property name', 'property', 'hotel_name', 'name'],
        description: 'Official name of the hotel property (unique, min 2 chars).',
        example: 'Rivendell Hotel'
      },
      {
        key: 'hotel_code',
        label: 'Hotel Code',
        required: false,
        aliases: ['hotel code', 'code', 'hotel_code', 'property code'],
        description: 'Short company identifier (e.g., RIV, MNT).',
        example: 'RIV'
      },
      {
        key: 'area',
        label: 'Area / Region',
        required: false,
        aliases: ['area', 'region', 'location', 'district', 'city'],
        description: 'Geographical area or town.',
        example: 'Kandy'
      },
      {
        key: 'service_type',
        label: 'Service Type',
        required: false,
        aliases: ['service type', 'service', 'service_type', 'type'],
        description: 'Distribution type: ONLINE, OFFLINE, or BOTH (Default: BOTH).',
        example: 'BOTH'
      },
      {
        key: 'status',
        label: 'Status',
        required: false,
        aliases: ['status', 'active status', 'active'],
        description: 'ACTIVE or INACTIVE (Default: ACTIVE).',
        example: 'ACTIVE'
      }
    ],
    sampleRows: [
      {
        hotel_name: 'Mount Randholee Resorts & Spa (Example Only)',
        hotel_code: 'MRR',
        area: 'Kandy',
        service_type: 'BOTH',
        status: 'ACTIVE'
      },
      {
        hotel_name: 'Grand Beragala Boutique Resort (Example Only)',
        hotel_code: 'GBR',
        area: 'Beragala / Haputale',
        service_type: 'BOTH',
        status: 'ACTIVE'
      }
    ]
  },

  SEASONS: {
    id: 'SEASONS',
    title: 'Hotel Seasons',
    shortDescription: 'Seasonal validity calendar configured per hotel property.',
    parentEntityHint: 'Hotel Name must match an existing Hotel in the system.',
    columns: [
      {
        key: 'hotel_name',
        label: 'Hotel Name',
        required: true,
        aliases: ['hotel name', 'hotel', 'property name', 'property', 'hotel_name'],
        description: 'Exact name of existing partner hotel in CRM.',
        example: 'Rivendell Hotel'
      },
      {
        key: 'season_label',
        label: 'Season Name / Label',
        required: true,
        aliases: ['season name', 'season label', 'season', 'season_label', 'label'],
        description: 'Seasonal label (unique per hotel, e.g., Summer 2026).',
        example: 'Summer 2026'
      },
      {
        key: 'date_from',
        label: 'Date From (Start Date)',
        required: true,
        aliases: ['date from', 'start date', 'from date', 'date_from', 'valid from', 'start'],
        description: 'Start date formatted as YYYY-MM-DD.',
        example: '2026-05-01'
      },
      {
        key: 'date_to',
        label: 'Date To (End Date)',
        required: true,
        aliases: ['date to', 'end date', 'to date', 'date_to', 'valid to', 'end'],
        description: 'End date formatted as YYYY-MM-DD (must be after Date From).',
        example: '2026-10-31'
      },
      {
        key: 'status',
        label: 'Status',
        required: false,
        aliases: ['status', 'season status'],
        description: 'ACTIVE, UPCOMING, or EXPIRED (Default: ACTIVE).',
        example: 'ACTIVE'
      }
    ],
    sampleRows: [
      {
        hotel_name: 'Rivendell Hotel',
        season_label: 'Winter 2026/2027',
        date_from: '2026-11-01',
        date_to: '2027-04-30',
        status: 'ACTIVE'
      },
      {
        hotel_name: 'Rivendell Hotel',
        season_label: 'Summer 2027',
        date_from: '2027-05-01',
        date_to: '2027-10-31',
        status: 'UPCOMING'
      }
    ]
  },

  AGENCIES: {
    id: 'AGENCIES',
    title: 'Travel Agencies',
    shortDescription: 'Master travel agency company and tour operator partner profiles.',
    columns: [
      {
        key: 'name',
        label: 'Agency Name',
        required: true,
        aliases: ['agency name', 'agency', 'company name', 'company', 'name', 'travel agency'],
        description: 'Official corporate travel agency name (unique, min 2 chars).',
        example: 'Jetwing Travels'
      },
      {
        key: 'code',
        label: 'Agency Code',
        required: false,
        aliases: ['agency code', 'code', 'company code', 'iata code'],
        description: 'Short agency identifier code (e.g., JET, TUI).',
        example: 'JET'
      },
      {
        key: 'country',
        label: 'Country',
        required: false,
        aliases: ['country', 'nation'],
        description: 'Country of registration/origin.',
        example: 'Sri Lanka'
      },
      {
        key: 'city',
        label: 'City',
        required: false,
        aliases: ['city', 'town', 'headquarters'],
        description: 'Headquarters city or branch.',
        example: 'Colombo'
      },
      {
        key: 'phone',
        label: 'Phone Number',
        required: false,
        aliases: ['phone', 'telephone', 'mobile', 'tel', 'contact number'],
        description: 'Primary telephone/hotline (international format supported).',
        example: '+94 11 2345678'
      },
      {
        key: 'email',
        label: 'Corporate Email',
        required: false,
        aliases: ['email', 'corporate email', 'email address', 'e-mail'],
        description: 'Official general email contact address.',
        example: 'inbound@jetwing.lk'
      },
      {
        key: 'status',
        label: 'Status',
        required: false,
        aliases: ['status', 'agency status'],
        description: 'ACTIVE or INACTIVE (Default: ACTIVE).',
        example: 'ACTIVE'
      }
    ],
    sampleRows: [
      {
        name: 'Aitken Spence Travels (Example)',
        code: 'AST',
        country: 'Sri Lanka',
        city: 'Colombo',
        phone: '+94 11 2499000',
        email: 'info@aitkenspence.lk',
        status: 'ACTIVE'
      },
      {
        name: 'Diethelm Travel Sri Lanka (Example)',
        code: 'DTS',
        country: 'Sri Lanka',
        city: 'Colombo',
        phone: '+94 11 2307000',
        email: 'inbound@diethelm.lk',
        status: 'ACTIVE'
      }
    ]
  },

  MARKETS: {
    id: 'MARKETS',
    title: 'Markets',
    shortDescription: 'Regional market desks partitioned under parent travel agencies.',
    parentEntityHint: 'Agency Name must match an existing Travel Agency in the system.',
    columns: [
      {
        key: 'agency_name',
        label: 'Agency Name',
        required: true,
        aliases: ['agency name', 'agency', 'company name', 'company', 'travel agency'],
        description: 'Exact name of existing parent travel agency in CRM.',
        example: 'Jetwing Travels'
      },
      {
        key: 'market_name',
        label: 'Market Desk Name',
        required: true,
        aliases: ['market name', 'market', 'desk', 'regional desk', 'market_name'],
        description: 'Name of the regional market desk (min 2 chars).',
        example: 'UK & Europe Desk'
      },
      {
        key: 'description',
        label: 'Description / Notes',
        required: false,
        aliases: ['description', 'notes', 'market description'],
        description: 'Optional operational notes or region scope.',
        example: 'Handling UK and Scandinavian leisure inquiries'
      }
    ],
    sampleRows: [
      {
        agency_name: 'Jetwing Travels',
        market_name: 'UK & Europe Desk',
        description: 'Inbound tours from United Kingdom & Western Europe'
      },
      {
        agency_name: 'Jetwing Travels',
        market_name: 'Indian & Middle East Market',
        description: 'FIT and Series bookings across GCC and India'
      }
    ]
  },

  MEMBERS: {
    id: 'MEMBERS',
    title: 'Members / Contacts',
    shortDescription: 'Agency contact personnel linked to specific agencies and market desks.',
    parentEntityHint: 'Agency Name & Market Name must match an existing desk in the system.',
    columns: [
      {
        key: 'agency_name',
        label: 'Agency Name',
        required: true,
        aliases: ['agency name', 'agency', 'company name', 'company', 'travel agency'],
        description: 'Exact name of existing parent travel agency in CRM.',
        example: 'Jetwing Travels'
      },
      {
        key: 'market_name',
        label: 'Market Desk Name',
        required: true,
        aliases: ['market name', 'market', 'desk', 'regional desk'],
        description: 'Exact name of the market desk under the agency.',
        example: 'UK & Europe Desk'
      },
      {
        key: 'full_name',
        label: 'Contact Person Name',
        required: true,
        aliases: ['full name', 'person name', 'contact name', 'name', 'member name', 'contact'],
        description: 'Full name of the contact person (min 2 chars).',
        example: 'Sarith Perera'
      },
      {
        key: 'email',
        label: 'Email Address',
        required: true,
        aliases: ['email', 'email address', 'e-mail', 'contact email'],
        description: 'Valid RFC 5322 email address (e.g. name@agency.com).',
        example: 'sarith@jetwing.lk'
      },
      {
        key: 'position',
        label: 'Designation / Title',
        required: false,
        aliases: ['position', 'designation', 'job title', 'role', 'title'],
        description: 'Professional position or job title.',
        example: 'Senior Contracting Manager'
      },
      {
        key: 'phone',
        label: 'Direct Phone / Mobile',
        required: false,
        aliases: ['phone', 'mobile', 'direct line', 'contact number', 'telephone'],
        description: 'Direct phone or WhatsApp number.',
        example: '+94 77 1234567'
      },
      {
        key: 'member_code',
        label: 'Member Code',
        required: false,
        aliases: ['member code', 'code', 'agent code', 'staff id'],
        description: 'Optional internal reference code.',
        example: 'AGT-001'
      },
      {
        key: 'status',
        label: 'Status',
        required: false,
        aliases: ['status', 'member status'],
        description: 'ACTIVE or INACTIVE (Default: ACTIVE).',
        example: 'ACTIVE'
      }
    ],
    sampleRows: [
      {
        agency_name: 'Jetwing Travels',
        market_name: 'UK & Europe Desk',
        full_name: 'Sarith Perera',
        email: 'sarith@jetwing.lk',
        position: 'Contracting Manager',
        phone: '+94 77 1234567',
        member_code: 'JET-UK-01',
        status: 'ACTIVE'
      },
      {
        agency_name: 'Jetwing Travels',
        market_name: 'UK & Europe Desk',
        full_name: 'Jana Fernando',
        email: 'jana@jetwing.lk',
        position: 'Assistant Manager Inbound',
        phone: '+94 77 7654321',
        member_code: 'JET-UK-02',
        status: 'ACTIVE'
      }
    ]
  }
};

