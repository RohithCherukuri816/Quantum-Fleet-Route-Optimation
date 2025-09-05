{
  "name": "ContactLead",
  "type": "object",
  "properties": {
    "full_name": {
      "type": "string",
      "description": "Contact's full name"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Contact email address"
    },
    "company": {
      "type": "string",
      "description": "Company name"
    },
    "phone": {
      "type": "string",
      "description": "Phone number"
    },
    "message": {
      "type": "string",
      "description": "Contact message"
    },
    "lead_source": {
      "type": "string",
      "enum": [
        "contact_form",
        "demo_request",
        "pricing_inquiry"
      ],
      "default": "contact_form"
    },
    "company_size": {
      "type": "string",
      "enum": [
        "startup",
        "small",
        "medium",
        "enterprise"
      ],
      "description": "Company size category"
    }
  },
  "required": [
    "full_name",
    "email",
    "message"
  ]
}