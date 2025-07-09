export interface VerificationLogDTO {
  id: number;
  userId?: string; // user_sk (UUID)
  targetType: "Price" | "Product";
  targetId: string; // UUID
  action: "Verify" | "Flag" | "Correct";
  createdAt: string;
}
