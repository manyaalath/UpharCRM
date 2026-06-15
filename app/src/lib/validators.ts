// ============================================================
// Uphar CRM — Field Validators
// ============================================================

export interface ValidationResult {
  valid: boolean;
  fields: Record<string, string>;
}

export function validateChallan(data: Record<string, unknown>): ValidationResult {
  const fields: Record<string, string> = {};

  if (!data.challan_no || String(data.challan_no).trim() === '') {
    fields.challan_no = 'Challan number is required';
  }

  if (!data.challan_date) {
    fields.challan_date = 'Date is required';
  }

  if (!data.teacher_name || String(data.teacher_name).trim() === '') {
    fields.teacher_name = 'Teacher/Contact name is required';
  } else if (String(data.teacher_name).length > 255) {
    fields.teacher_name = 'Name must be under 255 characters';
  }

  if (!data.institute_name || String(data.institute_name).trim() === '') {
    fields.institute_name = 'Institute name is required';
  } else if (String(data.institute_name).length > 255) {
    fields.institute_name = 'Institute name must be under 255 characters';
  }

  if (!data.address || String(data.address).trim() === '') {
    fields.address = 'Address is required';
  } else if (String(data.address).length > 500) {
    fields.address = 'Address must be under 500 characters';
  }

  if (!data.district || String(data.district).trim() === '') {
    fields.district = 'District is required';
  } else if (String(data.district).length > 100) {
    fields.district = 'District must be under 100 characters';
  }

  if (!data.pincode || String(data.pincode).trim() === '') {
    fields.pincode = 'Pincode is required';
  } else if (!/^\d{6}$/.test(String(data.pincode))) {
    fields.pincode = 'Must be exactly 6 digits';
  }

  if (!data.mobile_no || String(data.mobile_no).trim() === '') {
    fields.mobile_no = 'Mobile number is required';
  } else if (!/^\d{10}$/.test(String(data.mobile_no))) {
    fields.mobile_no = 'Must be exactly 10 digits';
  }

  if (!data.specimens_given) {
    fields.specimens_given = 'At least one specimen is required';
  } else if (
    !Array.isArray(data.specimens_given) ||
    data.specimens_given.length === 0
  ) {
    fields.specimens_given = 'At least one specimen is required';
  }

  if (!data.agent_name || String(data.agent_name).trim() === '') {
    fields.agent_name = 'Agent name is required';
  } else if (String(data.agent_name).length > 100) {
    fields.agent_name = 'Agent name must be under 100 characters';
  }

  return {
    valid: Object.keys(fields).length === 0,
    fields,
  };
}
