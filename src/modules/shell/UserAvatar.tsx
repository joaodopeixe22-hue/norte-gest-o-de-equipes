import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/modules/auth/useMe";
import { cn } from "@/lib/utils";

export function UserAvatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      {url && <AvatarImage src={url} alt="" />}
      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
