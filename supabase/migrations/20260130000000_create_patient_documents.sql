-- Create the patient_documents table
create table if not exists public.patient_documents (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.patients(id) on delete cascade not null,
  file_path text not null,
  file_type text not null,
  file_size integer,
  analysis_result jsonb, -- Stores the AI analysis output
  uploaded_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.patient_documents enable row level security;

-- Policies for patient_documents
create policy "Enable read access for authenticated users"
  on public.patient_documents for select to authenticated
  using (true);

create policy "Enable insert for authenticated users"
  on public.patient_documents for insert to authenticated
  with check (auth.uid() = uploaded_by);

create policy "Enable update for authenticated users"
  on public.patient_documents for update to authenticated
  using (auth.uid() = uploaded_by);

-- Create a new storage bucket for patient documents
insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Give users access to own folder"
on storage.objects for select to authenticated
using ( bucket_id = 'patient-documents' ); 

create policy "Give users upload access to own folder"
on storage.objects for insert to authenticated
with check ( bucket_id = 'patient-documents' );

create policy "Give users update access to own folder"
on storage.objects for update to authenticated
with check ( bucket_id = 'patient-documents' );
