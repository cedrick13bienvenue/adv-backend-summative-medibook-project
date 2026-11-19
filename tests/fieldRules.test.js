const { validateFields } = require('../src/validators/fieldRules');
const { patientSchema, doctorSchema } = require('../src/validators/schemas');

describe('validateFields', () => {
  test('accepts and normalises a valid patient', () => {
    const { value, errors } = validateFields(
      { full_name: '  Ama Mensah ', email: 'AMA@Mail.com', phone: '0244-111-222' },
      patientSchema,
    );
    expect(errors).toEqual([]);
    expect(value).toEqual({ full_name: 'Ama Mensah', email: 'ama@mail.com', phone: '0244-111-222' });
  });

  test('reports every missing and unknown field', () => {
    const { errors } = validateFields({ nickname: 'Ama' }, patientSchema);
    expect(errors).toEqual(
      expect.arrayContaining(['nickname is not an allowed field', 'full_name is required', 'email is required', 'phone is required']),
    );
  });

  test('normalises fees to two decimals and rejects negative or over-precise fees', () => {
    const valid = validateFields({ consultation_fee: 150 }, doctorSchema, { partial: true });
    expect(valid.value.consultation_fee).toBe('150.00');
    expect(validateFields({ consultation_fee: -5 }, doctorSchema, { partial: true }).errors).toHaveLength(1);
    expect(validateFields({ consultation_fee: '10.999' }, doctorSchema, { partial: true }).errors).toHaveLength(1);
  });

  test('partial updates need at least one field and reject non-object bodies', () => {
    expect(validateFields({}, doctorSchema, { partial: true }).errors).toEqual(['Provide at least one field to update']);
    expect(validateFields([], doctorSchema).errors).toEqual(['Request body must be a JSON object']);
  });
});
