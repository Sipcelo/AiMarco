import React, { useState } from "react";
import { TextInput, TextInputProps, View, Text } from "react-native";

interface PhoneInputProps extends Omit<TextInputProps, "onChangeText"> {
  value: string;
  onChangeText: (text: string) => void;
  onChangeFormattedText?: (formatted: string) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  style?: any;
  containerStyle?: any;
  labelStyle?: any;
  errorStyle?: any;
}

/**
 * Brazilian Phone Input Component with Auto-Masking
 *
 * Features:
 * - Auto-formats input as user types
 * - Accepts: +55 country code, DDD area codes, and phone numbers
 * - Supports both mobile (9 digits) and landline (8 digits)
 * - Visual mask: (11) 99999-9999 or (11) 3333-3333
 * - Strips formatting for backend
 * - Shows error messages
 * - Optional label and required indicator
 *
 * @example
 * <PhoneInput
 *   value={phone}
 *   onChangeText={setPhone}
 *   placeholder="(11) 99999-9999"
 *   error={phoneError}
 *   label="Telefone"
 *   required
 * />
 */
export function PhoneInput({
  value,
  onChangeText,
  onChangeFormattedText,
  placeholder = "(11) 99999-9999",
  error,
  label,
  required = false,
  disabled = false,
  style,
  containerStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}: PhoneInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Apply Brazilian phone mask as user types
   * - Strips all non-digits
   * - Accepts: +55 country code (optional in input)
   * - Builds: +55DDNNNNNNNNN or stored as DDNNNNNNNNN
   * - Displays: (DD) 9XXXX-XXXX or (DD) XXXX-XXXX
   */
  const applyPhoneMask = (input: string) => {
    // Extract only digits
    let digitsOnly = input.replace(/\D/g, "");

    if (digitsOnly.length === 0) {
      onChangeText("");
      onChangeFormattedText?.("");
      return;
    }

    // Handle if user typed country code 55
    if (digitsOnly.startsWith("55") && digitsOnly.length > 2) {
      digitsOnly = digitsOnly.substring(2);
    }

    // Limit to area code (2) + phone number (max 9 for mobile, 8 for landline)
    // So max 11 digits total (2 + 9)
    if (digitsOnly.length > 11) {
      digitsOnly = digitsOnly.substring(0, 11);
    }

    // Format for display based on length
    let formatted = "";

    if (digitsOnly.length <= 2) {
      // Just area code: (11) → show as typed
      formatted = digitsOnly; // "1" →  "11"
    } else if (digitsOnly.length <= 7) {
      // Area code + first part of number: (11) 9999 or (11) 3333
      formatted = `(${digitsOnly.substring(0, 2)}) ${digitsOnly.substring(2)}`;
    } else {
      // Full number: (11) 99999-9999 or (11) 3333-3333
      // Mobile: 11 total digits (DD + 9NNNNNNNN)
      // Landline: 10 total digits (DD + 8NNNNNNNN)
      const areaCode = digitsOnly.substring(0, 2);
      const phoneNumber = digitsOnly.substring(2);

      if (phoneNumber.length === 9) {
        // Mobile: 9XXXX-XXXX
        formatted = `(${areaCode}) ${phoneNumber.substring(0, 5)}-${phoneNumber.substring(5)}`;
      } else if (phoneNumber.length === 8) {
        // Landline: XXXX-XXXX
        formatted = `(${areaCode}) ${phoneNumber.substring(0, 4)}-${phoneNumber.substring(4)}`;
      } else {
        // Partial: (DD) and building
        formatted = `(${areaCode}) ${phoneNumber}`;
      }
    }

    // Store unformatted (but with +55 for backend)
    // If we have at least 11 digits (complete), add country code
    const unformatted =
      digitsOnly.length >= 10 ? `+55${digitsOnly}` : digitsOnly;

    onChangeText(unformatted);
    onChangeFormattedText?.(formatted);
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={[
            {
              fontSize: 14,
              fontWeight: "600",
              marginBottom: 6,
              color: disabled ? "#999" : "#333",
            },
            labelStyle,
          ]}
        >
          {label}
          {required && <Text style={{ color: "#E11D48" }}> *</Text>}
        </Text>
      )}

      <TextInput
        keyboardType="phone-pad"
        placeholder={placeholder}
        placeholderTextColor="#999"
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChangeText={applyPhoneMask}
        value={value.slice(0, 3) === "+55" ? value.slice(3) : value}
        maxLength={15}
        style={[
          {
            backgroundColor: disabled ? "#F5F5F5" : "#FFF",
            borderWidth: 1,
            borderColor: error ? "#E11D48" : isFocused ? "#3B82F6" : "#DEE2E6",
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: disabled ? "#999" : "#333",
          },
          style,
        ]}
        {...textInputProps}
      />

      {error && (
        <Text
          style={[
            {
              fontSize: 12,
              color: "#E11D48",
              marginTop: 4,
            },
            errorStyle,
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

export default PhoneInput;
