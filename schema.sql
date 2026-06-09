-- Estate Security Levy Management System
-- Database Schema & RLS Setup

-- ENUMs
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ESTATE_MANAGER', 'ACCOUNT_OFFICER', 'VIEW_ONLY');

-- 1. Estates Table
CREATE TABLE public.estates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Roles Table
-- Maps Supabase auth.users to an estate and role
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
    role user_role DEFAULT 'VIEW_ONLY'::user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Landlords Table
CREATE TABLE public.landlords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE NOT NULL,
    landlord_name VARCHAR(255) NOT NULL,
    compound_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    monthly_levy DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Payments Table
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    landlord_id UUID REFERENCES public.landlords(id) ON DELETE CASCADE NOT NULL,
    payment_month VARCHAR(3) NOT NULL, -- 'jan', 'feb', etc.
    payment_year VARCHAR(4) NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(landlord_id, payment_month, payment_year)
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User Roles
CREATE POLICY "Users can read their own role" 
ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies: Estates
CREATE POLICY "Users can view their assigned estate" 
ON public.estates FOR SELECT USING (
    id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid())
);

-- RLS Policies: Landlords
CREATE POLICY "Users can view landlords in their estate" 
ON public.landlords FOR SELECT USING (
    estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Managers and Admins can insert/update landlords" 
ON public.landlords FOR ALL USING (
    estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('SUPER_ADMIN', 'ESTATE_MANAGER', 'ACCOUNT_OFFICER'))
);

-- RLS Policies: Payments
CREATE POLICY "Users can view payments for their estate" 
ON public.payments FOR SELECT USING (
    landlord_id IN (SELECT id FROM public.landlords WHERE estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid()))
);

CREATE POLICY "Officers, Managers, and Admins can manage payments" 
ON public.payments FOR ALL USING (
    landlord_id IN (SELECT id FROM public.landlords WHERE estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('SUPER_ADMIN', 'ESTATE_MANAGER', 'ACCOUNT_OFFICER')))
);

-- Trigger to automatically create a user_role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'VIEW_ONLY');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
