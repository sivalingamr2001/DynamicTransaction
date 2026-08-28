import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Logo from "../assets/jana.png"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default Logo
