export type SignInCardProps = {
  action: (formData: FormData) => void | Promise<void>;
  callbackUrl: string;
  error: string | null;
};

export default function SignInCard(props: SignInCardProps) {
  void props;
  return null;
}
