-- Create multi-tenant organization system

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_id UUID NOT NULL,
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'starter',
  max_users INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization members table
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create organization usage tracking table
CREATE TABLE public.organization_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  storage_used_bytes BIGINT DEFAULT 0,
  user_count INTEGER DEFAULT 1,
  api_calls_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT organization_usage_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE(organization_id)
);

-- Enable RLS on organization_usage
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;

-- Update existing tables to be organization-scoped
ALTER TABLE public.projects ADD COLUMN organization_id UUID;
ALTER TABLE public.teams ADD COLUMN organization_id UUID;
ALTER TABLE public.tasks ADD COLUMN organization_id UUID;
ALTER TABLE public.files ADD COLUMN organization_id UUID;
ALTER TABLE public.messages ADD COLUMN organization_id UUID;
ALTER TABLE public.attendance ADD COLUMN organization_id UUID;
ALTER TABLE public.leave_requests ADD COLUMN organization_id UUID;
ALTER TABLE public.personal_todos ADD COLUMN organization_id UUID;

-- Add foreign key constraints
ALTER TABLE public.projects ADD CONSTRAINT projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.teams ADD CONSTRAINT teams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.files ADD CONSTRAINT files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.personal_todos ADD CONSTRAINT personal_todos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
FOR SELECT USING (
  owner_id = auth.uid() OR
  id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create organizations" ON public.organizations
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners can update" ON public.organizations
FOR UPDATE USING (auth.uid() = owner_id);

-- Create RLS policies for organization_members
CREATE POLICY "Members can view their organization membership" ON public.organization_members
FOR SELECT USING (
  user_id = auth.uid() OR
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can manage members" ON public.organization_members
FOR ALL USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

-- Create RLS policies for organization_usage
CREATE POLICY "Organization members can view usage" ON public.organization_usage
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "System can update usage" ON public.organization_usage
FOR ALL USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize organization usage
CREATE OR REPLACE FUNCTION public.initialize_organization_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_usage (organization_id, user_count)
  VALUES (NEW.id, 1);
  
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize usage when organization is created
CREATE TRIGGER initialize_organization_usage_trigger
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.initialize_organization_usage();