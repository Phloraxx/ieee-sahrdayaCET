// Registration Types

export interface FormField {
    id: string;
    type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
}

export interface FormTemplate {
    eventId: string;
    title: string;
    description?: string;
    fields: FormField[];
    standardFields: {
        name: boolean;
        email: boolean;
        phone: boolean;
        semester: boolean;
        department: boolean;
        section: boolean;
        rollNumber: boolean;
    };
    customQuestions: FormField[];
}

export interface RegistrationData {
    // Standard fields
    name?: string;
    email?: string;
    phone?: string;
    semester?: string;
    department?: string;
    section?: string;
    rollNumber?: string;
    // Custom fields stored as key-value pairs
    customFields?: Record<string, string | number | boolean>;
}

export interface Registration {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    eventId: string;
    userId: string;
    ticketId: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in';
    paymentStatus: 'not_required' | 'pending' | 'completed' | 'failed' | 'refunded';
    paymentAmount?: number;
    paymentTransactionId?: string;
    formData: RegistrationData;
    checkedInAt?: string;
}

export interface Ticket {
    ticketId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventVenue?: string;
    userId: string;
    userName: string;
    userEmail: string;
    registrationId: string;
    status: Registration['status'];
    qrCodeData: string;
    createdAt: string;
}

export type RegistrationStep = 'auth' | 'form' | 'payment' | 'success';

export interface PaymentInfo {
    upiId: string;
    merchantName: string;
    amount: number;
    ticketId: string;
    transactionNote: string;
}

// Department options
export const DEPARTMENTS = [
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Information Technology',
    'Applied Electronics & Instrumentation',
    'Other',
] as const;

// Semester options
export const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const;

// Section options
export const SECTIONS = ['A', 'B', 'C', 'D'] as const;
