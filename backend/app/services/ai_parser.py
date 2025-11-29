import httpx
import base64
import json
import logging
from typing import Optional, Dict, Any
from pathlib import Path
from app.core.config import settings
from app.schemas.document import ParsedDocumentData

logger = logging.getLogger(__name__)


PRESCRIPTION_PARSE_PROMPT = """You are a medical document parser. Extract the following information from the provided PRESCRIPTION.

Return a valid JSON object with these fields:
{
  "document_type": "prescription",
  "prescription_date": "YYYY-MM-DD or null if not found",
  "doctor": {
    "name": "string or null",
    "title": "string or null (e.g., 'Dr.', 'Prof.')",
    "specialty": "string or null (e.g., 'Cardiologist', 'General Physician')",
    "degree": "string or null (e.g., 'MBBS, MD', 'MBBS')"
  },
  "hospital": {
    "name": "string or null",
    "address": "string or null"
  },
  "diagnosis": "string or null",
  "medicines": [
    {
      "name": "medicine name (required)",
      "dosage": "string or null (e.g., '500mg', '10ml')",
      "frequency": "string or null (e.g., 'twice daily', '3 times a day', 'once at night')",
      "timing": "string or null (e.g., 'after meals', 'before breakfast', 'empty stomach')",
      "duration_days": number or null (e.g., 7, 14, 30),
      "morning": true/false,
      "afternoon": true/false,
      "evening": true/false,
      "night": true/false,
      "instructions": "string or null (any special instructions)"
    }
  ],
  "additional_notes": "string or null (any other relevant information)",
  "suggested_file_name": "string - A descriptive file name based on the content (e.g., 'Dr_Smith_Cardiology_2024-01-15', 'Fever_Treatment_Dr_Jones', 'Annual_Checkup_Prescription')"
}

IMPORTANT RULES:
1. If a field cannot be determined from the document, set it to null - DO NOT guess
2. For medicines, only include medicines that are clearly mentioned
3. Parse dates in YYYY-MM-DD format
4. Be accurate and only extract information that is clearly visible
5. For suggested_file_name, create a concise, descriptive name using doctor name, specialty, diagnosis or main purpose, and date if available. Use underscores instead of spaces.
6. Return ONLY the JSON object, no additional text
"""


MEDICAL_REPORT_PARSE_PROMPT = """You are a medical document parser. Extract the following information from the provided MEDICAL REPORT (lab test, X-ray, MRI, ultrasound, blood test, etc.).

Return a valid JSON object with these fields:
{
  "document_type": "medical_report",
  "report_type": "string (e.g., 'blood_test', 'xray', 'mri', 'ct_scan', 'ultrasound', 'ecg', 'urine_test', 'other')",
  "report_title": "string or null (e.g., 'Complete Blood Count', 'Chest X-Ray', 'Liver Function Test')",
  "report_date": "YYYY-MM-DD or null if not found",
  "lab": {
    "name": "string or null",
    "address": "string or null"
  },
  "technician_name": "string or null",
  "referring_doctor": "string or null (doctor who requested the test)",
  "findings": "string or null (key findings from the report)",
  "conclusion": "string or null (doctor's impression/conclusion)",
  "recommendations": "string or null",
  "test_results": {
    "test_name": {
      "value": "string",
      "unit": "string or null",
      "reference_range": "string or null",
      "status": "normal/high/low/abnormal or null"
    }
  },
  "full_text": "string - Complete text content of the report for searching purposes",
  "summary": "string - Brief 2-3 sentence summary of the report",
  "suggested_file_name": "string - A descriptive file name based on the content (e.g., 'CBC_Report_2024-01-15', 'Chest_XRay_Dr_Smith', 'Liver_Function_Test_LabName')"
}

IMPORTANT RULES:
1. If a field cannot be determined, set it to null - DO NOT guess
2. For test_results, include ALL numeric/measurable results with their values
3. Parse dates in YYYY-MM-DD format
4. full_text should contain all readable text for search purposes
5. For suggested_file_name, create a concise, descriptive name using test type, lab name, date, or referring doctor. Use underscores instead of spaces.
6. Return ONLY the JSON object, no additional text
"""


DOCUMENT_TYPE_DETECTION_PROMPT = """Analyze this medical document and determine its type.
Return ONLY one of these values (no quotes, no explanation):
- prescription (if it contains medicine prescriptions)
- medical_report (if it's a lab test, X-ray, MRI, blood test, scan report, etc.)
- unknown (if you cannot determine the type)
"""


class AIParserService:
    def __init__(self):
        self.api_url = settings.OPENROUTER_API_URL
        self.default_model = settings.DEFAULT_AI_MODEL
    
    async def detect_document_type(
        self,
        file_content: bytes,
        file_type: str,
        api_key: str,
        model: str = None
    ) -> str:
        """Detect if document is a prescription or medical report."""
        if not api_key:
            return "unknown"
        
        model = model or self.default_model
        
        try:
            if file_type == 'pdf':
                content_data = await self._prepare_pdf_content(file_content)
            else:
                content_data = await self._prepare_image_content(file_content)
            
            response = await self._call_openrouter_simple(
                content_data, 
                DOCUMENT_TYPE_DETECTION_PROMPT,
                api_key, 
                model
            )
            
            doc_type = response.strip().lower()
            if doc_type in ['prescription', 'medical_report']:
                return doc_type
            return "unknown"
        except Exception as e:
            logger.error(f"Error detecting document type: {e}")
            return "unknown"
    
    async def parse_document(
        self, 
        file_content: bytes, 
        file_type: str,
        api_key: str,
        document_type: str = None,  # 'prescription', 'medical_report', or None for auto-detect
        model: str = None
    ) -> Dict[str, Any]:
        """
        Parse a medical document using OpenRouter AI
        
        Args:
            file_content: Raw file bytes
            file_type: 'pdf' or 'image'
            api_key: OpenRouter API key
            document_type: Type of document or None for auto-detection
            model: Optional model override
        
        Returns:
            Parsed data dictionary
        """
        if not api_key:
            return {"error": "No API key provided", "parsing_status": "failed"}
        
        model = model or self.default_model
        
        try:
            # Prepare the content for the AI
            if file_type == 'pdf':
                content_data = await self._prepare_pdf_content(file_content)
            else:
                content_data = await self._prepare_image_content(file_content)
            
            # Auto-detect document type if not specified
            if not document_type or document_type not in ['prescription', 'medical_report', 'lab_report', 'imaging']:
                document_type = await self.detect_document_type(file_content, file_type, api_key, model)
            
            # Normalize document type
            if document_type in ['lab_report', 'imaging', 'medical_report']:
                prompt = MEDICAL_REPORT_PARSE_PROMPT
                detected_type = "medical_report"
            else:
                prompt = PRESCRIPTION_PARSE_PROMPT
                detected_type = "prescription"
            
            # Call OpenRouter API with appropriate prompt
            response = await self._call_openrouter(content_data, prompt, api_key, model)
            response["detected_document_type"] = detected_type
            
            return response
            
        except Exception as e:
            logger.error(f"Error parsing document: {str(e)}")
            return {"error": str(e), "parsing_status": "failed"}
    
    async def parse_prescription(
        self,
        file_content: bytes,
        file_type: str,
        api_key: str,
        model: str = None
    ) -> Dict[str, Any]:
        """Parse a prescription document."""
        return await self.parse_document(file_content, file_type, api_key, "prescription", model)
    
    async def parse_medical_report(
        self,
        file_content: bytes,
        file_type: str,
        api_key: str,
        model: str = None
    ) -> Dict[str, Any]:
        """Parse a medical report (lab test, imaging, etc.)."""
        return await self.parse_document(file_content, file_type, api_key, "medical_report", model)
    
    async def _prepare_image_content(self, content: bytes) -> Dict:
        """Prepare image content for API"""
        base64_image = base64.b64encode(content).decode('utf-8')
        # Detect image type from content
        if content[:8] == b'\x89PNG\r\n\x1a\n':
            mime_type = 'image/png'
        elif content[:2] == b'\xff\xd8':
            mime_type = 'image/jpeg'
        elif content[:4] == b'RIFF' and content[8:12] == b'WEBP':
            mime_type = 'image/webp'
        else:
            mime_type = 'image/jpeg'  # default
        
        return {
            "type": "image",
            "data": f"data:{mime_type};base64,{base64_image}"
        }
    
    async def _prepare_pdf_content(self, content: bytes) -> Dict:
        """Prepare PDF content for API - convert first page to image"""
        try:
            # Try to convert PDF to image using PyPDF2 and Pillow
            from PyPDF2 import PdfReader
            from io import BytesIO
            
            # For simplicity, we'll send PDF as base64 and hope the model can handle it
            # More advanced: use pdf2image library to convert pages
            base64_pdf = base64.b64encode(content).decode('utf-8')
            
            return {
                "type": "pdf",
                "data": f"data:application/pdf;base64,{base64_pdf}"
            }
        except Exception as e:
            logger.warning(f"Error preparing PDF: {e}")
            # Fallback: send as base64
            base64_pdf = base64.b64encode(content).decode('utf-8')
            return {
                "type": "pdf", 
                "data": f"data:application/pdf;base64,{base64_pdf}"
            }
    
    async def _call_openrouter_simple(
        self,
        content_data: Dict,
        prompt: str,
        api_key: str,
        model: str
    ) -> str:
        """Make simple API call to OpenRouter for detection."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://medical-history.app",
            "X-Title": "Medical History App"
        }
        
        message_content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": content_data["data"]}}
        ]
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": message_content}],
            "max_tokens": 100,
            "temperature": 0.1
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.api_url, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            return "unknown"
    
    async def _call_openrouter(
        self, 
        content_data: Dict,
        prompt: str,
        api_key: str, 
        model: str
    ) -> Dict[str, Any]:
        """Make API call to OpenRouter"""
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://medical-history.app",
            "X-Title": "Medical History App"
        }
        
        # Build message content based on type
        message_content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": content_data["data"]}}
        ]
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": message_content
                }
            ],
            "max_tokens": 4000,
            "temperature": 0.1  # Low temperature for more deterministic output
        }
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"OpenRouter API error: {response.status_code} - {error_detail}")
                return {
                    "error": f"API error: {response.status_code}",
                    "parsing_status": "failed"
                }
            
            result = response.json()
            
            # Extract the response content
            try:
                content = result["choices"][0]["message"]["content"]
                # Parse the JSON from the response
                parsed_data = self._extract_json(content)
                parsed_data["parsing_status"] = "success" if "error" not in parsed_data else "failed"
                return parsed_data
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                logger.error(f"Error parsing API response: {e}")
                return {
                    "error": "Failed to parse API response",
                    "parsing_status": "failed",
                    "raw_response": result
                }
    
    def _extract_json(self, content: str) -> Dict[str, Any]:
        """Extract JSON from response content"""
        # Try to parse directly
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON in the content
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # Return error if we can't parse
        return {
            "error": "Could not parse response as JSON",
            "raw_content": content
        }
    
    def convert_parsed_to_schema(self, parsed_data: Dict[str, Any]) -> ParsedDocumentData:
        """Convert raw parsed data to schema"""
        return ParsedDocumentData(
            prescription_date=parsed_data.get("prescription_date"),
            doctor=parsed_data.get("doctor"),
            hospital_name=parsed_data.get("hospital_name"),
            diagnosis=parsed_data.get("diagnosis"),
            medicines=parsed_data.get("medicines", []),
            additional_notes=parsed_data.get("additional_notes")
        )


# Singleton instance
ai_parser = AIParserService()
