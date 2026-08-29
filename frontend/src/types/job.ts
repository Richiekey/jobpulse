export interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  remote_type: string;
  employment_type: string;
  department?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  job_url: string;
  apply_url: string;
  apply_url_original?: string;
  is_staffing_agency?: boolean;
  source: string;
  posted_at?: string;
  created_at?: string;
  skills?: string[];
  role_category?: string;
}

export interface LocationFilterState {
  country: string;
  allLocationsInCountry: boolean;
  cityOrState: string;
}

export interface JobsResponsePayload {
  items: Job[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
