import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile
from app.core.config import settings


class FileStorageService:
    def __init__(self, upload_dir: str = None):
        self.upload_dir = Path(upload_dir or settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def _generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename while preserving extension"""
        ext = Path(original_filename).suffix.lower()
        unique_id = uuid.uuid4().hex[:16]
        return f"{unique_id}{ext}"
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension without dot"""
        return Path(filename).suffix.lower().lstrip('.')
    
    def validate_file(self, filename: str, content_type: str, file_size: int) -> Tuple[bool, str]:
        """Validate uploaded file"""
        ext = self._get_file_extension(filename)
        
        if ext not in settings.ALLOWED_EXTENSIONS:
            return False, f"File type '{ext}' not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        
        if file_size > settings.MAX_FILE_SIZE:
            max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
            return False, f"File size exceeds maximum allowed ({max_mb}MB)"
        
        return True, ""
    
    async def save_file(self, file: UploadFile, user_id: int) -> Tuple[str, str, int]:
        """
        Save uploaded file and return (stored_filename, file_path, file_size)
        """
        # Create user-specific directory
        user_dir = self.upload_dir / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        stored_filename = self._generate_unique_filename(file.filename)
        file_path = user_dir / stored_filename
        
        # Read and save file
        content = await file.read()
        file_size = len(content)
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Return relative path from upload_dir
        relative_path = str(file_path.relative_to(self.upload_dir))
        return stored_filename, relative_path, file_size
    
    def get_full_path(self, relative_path: str) -> Path:
        """Get full path from relative path"""
        return self.upload_dir / relative_path
    
    async def read_file(self, relative_path: str) -> Optional[bytes]:
        """Read file content"""
        full_path = self.get_full_path(relative_path)
        if not full_path.exists():
            return None
        
        async with aiofiles.open(full_path, 'rb') as f:
            return await f.read()
    
    async def delete_file(self, relative_path: str) -> bool:
        """Delete a file"""
        full_path = self.get_full_path(relative_path)
        if full_path.exists():
            os.remove(full_path)
            return True
        return False
    
    def get_file_type(self, filename: str) -> str:
        """Determine file type category"""
        ext = self._get_file_extension(filename)
        if ext == 'pdf':
            return 'pdf'
        elif ext in ['jpg', 'jpeg', 'png', 'webp']:
            return 'image'
        return 'unknown'


# Singleton instance
file_storage = FileStorageService()
