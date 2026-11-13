"use client";

import { Button, addToast } from "@heroui/react";

export function SplitButton({ text }: { text: string }) {
  return (
    <Button
      color="primary"
      size="lg"
      radius="lg"
      className="font-semibold"
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(text);
          addToast({ title: "Message copied", description: "Paste it in your group chat to split the cost.", color: "success" });
        } catch {
          addToast({ title: "Copy didn't work", color: "warning" });
        }
      }}
    >
      Split with friends
    </Button>
  );
}
