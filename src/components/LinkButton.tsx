"use client";

import NextLink from "next/link";
import { Button, type ButtonProps } from "@heroui/react";

/** A HeroUI button that navigates. Usable from server components. */
export function LinkButton({ href, ...props }: Omit<ButtonProps, "as" | "href"> & { href: string }) {
  return <Button as={NextLink} href={href} {...props} />;
}
