import type { BloodGroup, DocumentType, Gender } from "@/lib/api/types";

export interface EnrollmentDocument {
  id: string;
  name: string;
  type: DocumentType;
  file?: File;
}

export interface EnrollmentFormData {
  // Step 1: Personal Details
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  email: string;
  mobile: string;
  bloodGroup: BloodGroup | "";
  guardianName: string;
  guardianContact: string;

  // Step 2: Academic Background
  departmentId: string;
  academicYearId: string;
  prevSchool: string;
  prevDegree: string;
  prevGpa: string;
  graduationYear: string;
  documents: EnrollmentDocument[];

  // Step 3: ID Assignment
  studentNumber: string;
}

export const INITIAL_ENROLLMENT_DATA: EnrollmentFormData = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "MALE",
  email: "",
  mobile: "",
  bloodGroup: "",
  guardianName: "",
  guardianContact: "",
  departmentId: "",
  academicYearId: "",
  prevSchool: "",
  prevDegree: "",
  prevGpa: "",
  graduationYear: "",
  documents: [],
  studentNumber: "",
};
