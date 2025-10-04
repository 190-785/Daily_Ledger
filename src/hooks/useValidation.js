import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation
 * Usage:
 * const { values, errors, handleChange, validate, resetValidation } = useValidation(
 *   { email: '', password: '' },
 *   { email: validateEmail, password: validatePassword }
 * );
 */
export function useValidation(initialValues = {}, validators = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /**
   * Handle input change with validation
   */
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Handle input blur (mark as touched)
   */
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on blur if field has validator
    if (validators[name]) {
      const result = validators[name](values[name]);
      if (!result.valid) {
        setErrors(prev => ({ ...prev, [name]: result.error }));
      }
    }
  }, [validators, values]);

  /**
   * Validate a specific field
   */
  const validateField = useCallback((name) => {
    if (!validators[name]) return true;
    
    const result = validators[name](values[name]);
    
    if (!result.valid) {
      setErrors(prev => ({ ...prev, [name]: result.error }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    
    return true;
  }, [validators, values]);

  /**
   * Validate all fields
   */
  const validate = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    for (const [name, validator] of Object.entries(validators)) {
      const result = validator(values[name]);
      if (!result.valid) {
        newErrors[name] = result.error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    
    // Mark all fields as touched
    setTouched(
      Object.keys(validators).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    
    return isValid;
  }, [validators, values]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Reset entire form
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Set values programmatically
   */
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  /**
   * Set error programmatically
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  /**
   * Check if form is valid (no errors)
   */
  const isValid = Object.keys(errors).length === 0;

  /**
   * Check if form has been touched
   */
  const isTouched = Object.keys(touched).length > 0;

  return {
    values,
    errors,
    touched,
    isValid,
    isTouched,
    handleChange,
    handleBlur,
    validate,
    validateField,
    resetValidation,
    reset,
    setFieldValue,
    setFieldError,
  };
}

/**
 * Simpler hook for single field validation
 */
export function useFieldValidation(initialValue = '', validator) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    if (error) setError('');
  }, [error]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    if (validator) {
      const result = validator(value);
      if (!result.valid) {
        setError(result.error);
      }
    }
  }, [validator, value]);

  const validate = useCallback(() => {
    if (!validator) return true;
    
    const result = validator(value);
    if (!result.valid) {
      setError(result.error);
      setTouched(true);
      return false;
    }
    
    return true;
  }, [validator, value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError('');
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    error,
    touched,
    isValid: !error,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValue,
  };
}
