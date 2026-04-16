export interface Profile {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  customer_name: string;
  description: string | null;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at: string;
  profiles?: Profile;
}

export interface ProjectWithMembers extends Project {
  project_members: ProjectMember[];
  owner?: Profile;
}

export interface Document {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size_bytes: number | null;
  parse_status: string;
  extracted_text: string | null;
  created_at: string;
}

export interface ProjectInsights {
  id: string;
  project_id: string;
  pain_points: any[];
  customer_goals: any[];
  problem_statement: string | null;
  current_workflows: any[];
  solution_components: any[];
  implementation_roadmap: any[];
  expected_outcomes: any[];
  last_generated_at: string | null;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  content: string;
  sources: any[];
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  project_id: string;
  template_id: string;
  generated_by: string;
  document_type: string;
  title: string;
  content: string;
  sources: any[];
  version: number;
  created_at: string;
}
