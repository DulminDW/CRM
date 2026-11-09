import { supabase } from '../lib/supabase';
import { adminActivityService } from './adminActivityService';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'ARCHIVED';

export type ConditionCategory =
  | 'CHECK_IN_OUT'
  | 'CANCELLATION'
  | 'CHILD_POLICY'
  | 'PAYMENT'
  | 'GALA_DINNER'
  | 'GENERAL'
  | 'SUPPLEMENT';

export interface ContractCondition {
  id: string;
  contract_id: string;
  condition_title: string;
  condition_description: string;
  condition_category: ConditionCategory;
  is_mandatory: boolean;
  is_internal_only: boolean;
  display_order: number;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  version_number: number;
  uploaded_by: string;
  created_at: string;
}

export interface ContractVersionRecord {
  id: string;
  contract_id: string;
  version_number: number;
  version_label: string;
  terms_snapshot?: string | null;
  conditions_snapshot?: ContractCondition[] | null;
  effective_from: string;
  effective_to: string;
  change_summary?: string | null;
  published_by: string;
  created_at: string;
}

export interface HotelContract {
  id: string;
  hotel_id: string;
  season_id?: string | null;
  associated_season_ids?: string[];
  contract_reference: string;
  contract_name: string;
  valid_from: string;
  valid_to: string;
  status: ContractStatus;
  currency: string;
  terms_and_conditions?: string | null;
  internal_notes?: string | null;
  document_storage_path?: string | null;
  version_number: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joins & Structured Children
  hotel_name?: string;
  season_label?: string;
  conditions?: ContractCondition[];
  documents?: ContractDocument[];
  versions?: ContractVersionRecord[];
}

export interface CreateContractPayload {
  hotel_id: string;
  season_id?: string | null;
  associated_season_ids?: string[];
  contract_reference: string;
  contract_name: string;
  valid_from: string;
  valid_to: string;
  status?: ContractStatus;
  currency?: string;
  terms_and_conditions?: string;
  internal_notes?: string;
  conditions?: Omit<ContractCondition, 'id' | 'contract_id'>[];
}

export interface UpdateContractPayload {
  contract_name?: string;
  valid_from?: string;
  valid_to?: string;
  status?: ContractStatus;
  terms_and_conditions?: string;
  internal_notes?: string;
  conditions?: ContractCondition[];
}

const LOCAL_STORAGE_CONTRACTS_KEY = 'window_crm_hotel_contracts_v1';

export const contractService = {
  /**
   * Determine whether a contract is expired based on current date
   */
  isContractExpired(validTo: string): boolean {
    const today = new Date().toISOString().split('T')[0]!;
    return validTo < today;
  },

  /**
   * Fetch all contracts with fallback to local state if table is in draft migration status
   */
  async getContracts(): Promise<HotelContract[]> {
    try {
      const { data, error } = await supabase
        .from('hotel_contracts')
        .select(`
          *,
          hotels (name),
          hotel_seasons (season_label)
        `)
        .order('valid_from', { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as unknown as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          hotel_id: String(row.hotel_id),
          season_id: row.season_id ? String(row.season_id) : null,
          contract_reference: String(row.contract_reference),
          contract_name: String(row.contract_name),
          valid_from: String(row.valid_from),
          valid_to: String(row.valid_to),
          status: (row.status as ContractStatus) || 'ACTIVE',
          currency: String(row.currency || 'USD'),
          terms_and_conditions: row.terms_and_conditions ? String(row.terms_and_conditions) : null,
          internal_notes: row.internal_notes ? String(row.internal_notes) : null,
          document_storage_path: row.document_storage_path ? String(row.document_storage_path) : null,
          version_number: Number(row.version_number || 1),
          created_by: String(row.created_by),
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
          hotel_name: ((row.hotels as { name?: string })?.name) || 'Unknown Hotel',
          season_label: ((row.hotel_seasons as { season_label?: string })?.season_label) || 'All Seasons',
          conditions: [],
          documents: [],
          versions: []
        }));
      }
    } catch {
      // Remote fetch non-fatal if table undeployed
    }

    // Local fallback
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CONTRACTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as HotelContract[];
        }
      }
    } catch (e) {
      console.warn('Failed to parse contracts from localStorage:', e);
    }

    return [];
  },

  /**
   * Fetch a single contract by ID with full conditions, versions, and documents
   */
  async getContractById(id: string): Promise<HotelContract | null> {
    const list = await this.getContracts();
    return list.find((c) => c.id === id) || null;
  },

  /**
   * Fetch eligible active contracts for a hotel and season
   */
  async getEligibleContracts(hotelId: string, seasonId?: string, quoteDate?: string): Promise<HotelContract[]> {
    const list = await this.getContracts();
    const targetDate = quoteDate || new Date().toISOString().split('T')[0]!;

    return list.filter((c) => {
      if (c.hotel_id !== hotelId) return false;
      if (c.status !== 'ACTIVE') return false;
      // Date validity check
      if (c.valid_from > targetDate || c.valid_to < targetDate) return false;
      // Season match if specified
      if (seasonId && c.season_id && c.season_id !== seasonId) {
        // Also check multi-season associations if present
        if (!c.associated_season_ids || !c.associated_season_ids.includes(seasonId)) {
          return false;
        }
      }
      return true;
    });
  },

  /**
   * Create a new contract with structured conditions
   */
  async createContract(
    payload: CreateContractPayload,
    userId: string,
    userName?: string,
    hotelName?: string,
    seasonLabel?: string
  ): Promise<HotelContract> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `contract_${Date.now()}`;
    const initialConditions: ContractCondition[] = (payload.conditions || []).map((cond, index) => ({
      ...cond,
      id: `cond_${Date.now()}_${index}`,
      contract_id: newId,
      display_order: index + 1
    }));

    const initialVersion: ContractVersionRecord = {
      id: `ver_${Date.now()}_1`,
      contract_id: newId,
      version_number: 1,
      version_label: 'v1.0 - Initial Contract Agreement',
      terms_snapshot: payload.terms_and_conditions || null,
      conditions_snapshot: initialConditions,
      effective_from: payload.valid_from,
      effective_to: payload.valid_to,
      change_summary: 'Initial draft registration',
      published_by: userId,
      created_at: new Date().toISOString()
    };

    const newContract: HotelContract = {
      id: newId,
      hotel_id: payload.hotel_id,
      season_id: payload.season_id || null,
      associated_season_ids: payload.associated_season_ids || (payload.season_id ? [payload.season_id] : []),
      contract_reference: payload.contract_reference.trim(),
      contract_name: payload.contract_name.trim(),
      valid_from: payload.valid_from,
      valid_to: payload.valid_to,
      status: payload.status || 'ACTIVE',
      currency: payload.currency || 'USD',
      terms_and_conditions: payload.terms_and_conditions?.trim() || null,
      internal_notes: payload.internal_notes?.trim() || null,
      version_number: 1,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      hotel_name: hotelName || 'Selected Property',
      season_label: seasonLabel || 'All Seasons',
      conditions: initialConditions,
      documents: [],
      versions: [initialVersion]
    };

    // Try remote insert
    try {
      await supabase.from('hotel_contracts').insert([{
        id: newContract.id,
        hotel_id: newContract.hotel_id,
        season_id: newContract.season_id,
        contract_reference: newContract.contract_reference,
        contract_name: newContract.contract_name,
        valid_from: newContract.valid_from,
        valid_to: newContract.valid_to,
        status: newContract.status,
        currency: newContract.currency,
        terms_and_conditions: newContract.terms_and_conditions,
        version_number: 1,
        created_by: userId
      }]);
    } catch {
      // Fallback to local
    }

    // Save locally
    try {
      const existing = await this.getContracts();
      const updated = [newContract, ...existing.filter((c) => c.id !== newContract.id)];
      localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save contract locally:', e);
    }

    // Audit Log
    await adminActivityService.logActivity({
      actor_id: userId,
      actor_name: userName || 'Authorized Staff',
      action: 'CONTRACT_CREATED' as unknown as import('./adminActivityService').AdminAuditActionType,
      target_table: 'hotel_contracts',
      target_record_id: newContract.id,
      hotel_id: newContract.hotel_id,
      hotel_name: newContract.hotel_name,
      new_values: {
        reference: newContract.contract_reference,
        name: newContract.contract_name,
        valid_from: newContract.valid_from,
        valid_to: newContract.valid_to,
        status: newContract.status
      },
      details: `Created new hotel contract "${newContract.contract_name}" (${newContract.contract_reference}) for ${newContract.hotel_name}`
    });

    return newContract;
  },

  /**
   * Update an existing contract
   */
  async updateContract(
    id: string,
    payload: UpdateContractPayload,
    userId: string,
    userName?: string
  ): Promise<HotelContract> {
    const list = await this.getContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Contract with ID ${id} not found.`);
    }

    const current = list[idx]!;
    const updatedContract: HotelContract = {
      ...current,
      ...payload,
      updated_at: new Date().toISOString()
    };

    list[idx] = updatedContract;
    localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(list));

    // Audit Log
    await adminActivityService.logActivity({
      actor_id: userId,
      actor_name: userName || 'Authorized Staff',
      action: 'CONTRACT_UPDATED' as unknown as import('./adminActivityService').AdminAuditActionType,
      target_table: 'hotel_contracts',
      target_record_id: id,
      hotel_id: updatedContract.hotel_id,
      hotel_name: updatedContract.hotel_name,
      old_values: { name: current.contract_name, status: current.status },
      new_values: { name: updatedContract.contract_name, status: updatedContract.status },
      details: `Updated contract "${updatedContract.contract_name}"`
    });

    return updatedContract;
  },

  /**
   * Publish a new version of the contract
   */
  async createNewVersion(
    id: string,
    newLabel: string,
    changeSummary: string,
    userId: string,
    userName?: string
  ): Promise<HotelContract> {
    const list = await this.getContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Contract ${id} not found.`);

    const current = list[idx]!;
    const nextVerNumber = current.version_number + 1;

    const newVersion: ContractVersionRecord = {
      id: `ver_${Date.now()}_${nextVerNumber}`,
      contract_id: id,
      version_number: nextVerNumber,
      version_label: newLabel.trim() || `v${nextVerNumber}.0 - Amended Terms`,
      terms_snapshot: current.terms_and_conditions || null,
      conditions_snapshot: current.conditions || [],
      effective_from: current.valid_from,
      effective_to: current.valid_to,
      change_summary: changeSummary.trim() || 'Contract terms revision',
      published_by: userId,
      created_at: new Date().toISOString()
    };

    const updatedContract: HotelContract = {
      ...current,
      version_number: nextVerNumber,
      updated_at: new Date().toISOString(),
      versions: [newVersion, ...(current.versions || [])]
    };

    list[idx] = updatedContract;
    localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(list));

    // Audit Log
    await adminActivityService.logActivity({
      actor_id: userId,
      actor_name: userName || 'Authorized Staff',
      action: 'CONTRACT_VERSION_CREATED' as unknown as import('./adminActivityService').AdminAuditActionType,
      target_table: 'hotel_contract_versions',
      target_record_id: newVersion.id,
      hotel_id: updatedContract.hotel_id,
      hotel_name: updatedContract.hotel_name,
      new_values: { version_number: nextVerNumber, label: newVersion.version_label, changeSummary },
      details: `Published new version v${nextVerNumber} for contract "${updatedContract.contract_name}"`
    });

    return updatedContract;
  },

  /**
   * Alias for backwards compatibility / UI convenience
   */
  async getContractsForHotel(hotelId: string, seasonId?: string): Promise<HotelContract[]> {
    return this.getEligibleContracts(hotelId, seasonId);
  },

  /**
   * Allowed contract document MIME types and max size (25MB)
   */
  DOCUMENT_RULES: {
    maxSizeBytes: 25 * 1024 * 1024, // 25 MB
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },

  /**
   * Validate a file before upload
   */
  validateContractFile(file: File): { valid: boolean; error?: string } {
    if (!file) return { valid: false, error: 'No file provided.' };
    if (file.size > this.DOCUMENT_RULES.maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds the 25MB limit (File is ${(file.size / (1024 * 1024)).toFixed(2)} MB).`
      };
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!this.DOCUMENT_RULES.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file type .${extension}. Only PDF, Word, and Excel files are permitted.`
      };
    }
    return { valid: true };
  },

  /**
   * Upload an actual document file to Supabase Storage ('hotel-contracts')
   * with guaranteed collision avoidance and immutable version linking.
   */
  async uploadContractFile(
    contractId: string,
    file: File,
    userId: string,
    userName?: string
  ): Promise<ContractDocument> {
    const validation = this.validateContractFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    const list = await this.getContracts();
    const idx = list.findIndex((c) => c.id === contractId);
    if (idx === -1) throw new Error('Contract not found');

    const contract = list[idx]!;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    // Unique versioned path: hotel_id/contract_id/v{version_number}_{timestamp}_{filename}
    const storagePath = `${contract.hotel_id}/${contractId}/v${contract.version_number}_${timestamp}_${cleanFileName}`;

    let remoteUploaded = false;
    // Attempt real upload to Supabase Storage bucket 'hotel-contracts'
    try {
      const { error: storageError } = await supabase.storage
        .from('hotel-contracts')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false // STRICT RULE: Never overwrite historical documents silently!
        });

      if (storageError) {
        console.warn('[contractService] Supabase Storage upload note (bucket may be draft or unprovisioned):', storageError.message);
      } else {
        remoteUploaded = true;
      }
    } catch (err) {
      console.warn('[contractService] Storage upload exception handled gracefully:', err);
    }

    // Save document record to DB / Mock layer
    const newDoc: ContractDocument = {
      id: `doc_${timestamp}`,
      contract_id: contractId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size,
      storage_path: storagePath,
      version_number: contract.version_number,
      uploaded_by: userId,
      created_at: new Date().toISOString()
    };

    // Attempt DB insert if table exists
    try {
      const { data: dbDoc, error: dbError } = await supabase
        .from('hotel_contract_documents')
        .insert({
          contract_id: contractId,
          file_name: newDoc.file_name,
          file_type: newDoc.file_type,
          file_size_bytes: newDoc.file_size_bytes,
          storage_path: newDoc.storage_path,
          version_number: newDoc.version_number,
          uploaded_by: userId
        })
        .select()
        .single();

      if (!dbError && dbDoc) {
        newDoc.id = dbDoc.id;
      }
    } catch {
      // Fallback to local storage if migration is draft
    }

    // Maintain local contract document state
    contract.documents = [newDoc, ...(contract.documents || [])];
    list[idx] = contract;
    localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(list));

    // Audit Logging
    await adminActivityService.logActivity({
      actor_id: userId,
      actor_name: userName || 'Authorized Staff',
      action: 'CONTRACT_DOCUMENT_UPLOADED' as unknown as import('./adminActivityService').AdminAuditActionType,
      target_table: 'hotel_contract_documents',
      target_record_id: newDoc.id,
      hotel_id: contract.hotel_id,
      hotel_name: contract.hotel_name,
      new_values: {
        fileName: file.name,
        size: file.size,
        version: contract.version_number,
        storagePath,
        remoteUploaded
      },
      details: `Uploaded signed document "${file.name}" (${(file.size / 1024).toFixed(1)} KB) linked to contract ${contract.contract_reference} (v${contract.version_number})`
    });

    return newDoc;
  },

  /**
   * Securely retrieve download URL for a contract document.
   * Generates a short-lived authenticated signed URL (15 minutes expiry)
   * or a safe object URL for preview.
   */
  async getSecureDocumentUrl(storagePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('hotel-contracts')
        .createSignedUrl(storagePath, 900); // 15 minutes (900 seconds)

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('[contractService] Signed URL creation note:', err);
    }
    // Safe fallback notification placeholder if offline or storage draft
    return `#document-vault-${encodeURIComponent(storagePath)}`;
  },

  /**
   * Attach an uploaded document metadata record
   */
  async attachDocument(
    contractId: string,
    doc: { file_name: string; file_type: string; file_size_bytes: number; storage_path: string },
    userId: string,
    userName?: string
  ): Promise<ContractDocument> {
    const list = await this.getContracts();
    const idx = list.findIndex((c) => c.id === contractId);
    if (idx === -1) throw new Error('Contract not found');

    const contract = list[idx]!;
    const newDoc: ContractDocument = {
      id: `doc_${Date.now()}`,
      contract_id: contractId,
      file_name: doc.file_name,
      file_type: doc.file_type,
      file_size_bytes: doc.file_size_bytes,
      storage_path: doc.storage_path,
      version_number: contract.version_number,
      uploaded_by: userId,
      created_at: new Date().toISOString()
    };

    contract.documents = [newDoc, ...(contract.documents || [])];
    list[idx] = contract;
    localStorage.setItem(LOCAL_STORAGE_CONTRACTS_KEY, JSON.stringify(list));

    await adminActivityService.logActivity({
      actor_id: userId,
      actor_name: userName || 'Authorized Staff',
      action: 'CONTRACT_DOCUMENT_UPLOADED' as unknown as import('./adminActivityService').AdminAuditActionType,
      target_table: 'hotel_contract_documents',
      target_record_id: newDoc.id,
      hotel_id: contract.hotel_id,
      hotel_name: contract.hotel_name,
      new_values: { fileName: doc.file_name, size: doc.file_size_bytes },
      details: `Uploaded contract document "${doc.file_name}" to contract ${contract.contract_reference}`
    });

    return newDoc;
  }
};
