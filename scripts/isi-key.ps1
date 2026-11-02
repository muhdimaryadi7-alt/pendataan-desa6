# Menyimpan key Supabase dari clipboard ke .env.local tanpa menampilkannya.
# Pemakaian: salin key di dashboard Supabase, lalu jalankan:
#   powershell -File scripts/isi-key.ps1
param([string]$Env = "$PSScriptRoot\..\.env.local")

$key = (Get-Clipboard -Raw).Trim()
if ($key -like 'sb_publishable_*') { $nama = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' }
elseif ($key -like 'sb_secret_*') { $nama = 'SUPABASE_SECRET_KEY' }
elseif ($key -like 'eyJ*') { Write-Output 'Clipboard berisi key format lama (JWT). Salin key yang diawali sb_publishable_ atau sb_secret_.'; exit 1 }
else { Write-Output 'Clipboard tidak berisi key Supabase (sb_publishable_... / sb_secret_...).'; exit 1 }

$baris = Get-Content $Env -Encoding UTF8
$baris = $baris | ForEach-Object { if ($_ -match "^$nama=") { "$nama=$key" } else { $_ } }
Set-Content $Env $baris -Encoding UTF8
Write-Output "$nama tersimpan ($($key.Length) karakter)."
