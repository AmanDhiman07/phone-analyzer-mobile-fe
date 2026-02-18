/**
 * Backup folder structure:
 *   {documentDirectory}/Backups/DataGuard/
 *     backups/
 *       {YYYY-MM-DD_HH-mm-ss}/
 *         manifest.json
 *         contacts.json
 *         messages.json
 *         callLogs.json
 */

export const BACKUP_FOLDER_NAME = "DataGuard";
export const BACKUPS_SUBFOLDER = "backups";
export const MANIFEST_FILE = "manifest.json";
export const CONTACTS_FILE = "contacts.json";
export const MESSAGES_FILE = "messages.json";
export const CALL_LOGS_FILE = "callLogs.json";
