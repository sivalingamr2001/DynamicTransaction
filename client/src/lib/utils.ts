import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Logo from "../assets/jana.png"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default Logo

export function getCurrentTargetMonthOptions() {
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  const now = new Date()
  const currentVal = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const currentLabel = `${labels[now.getMonth()]} '${String(now.getFullYear()).slice(-2)}`

  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextVal = `${nextDate.getFullYear()}${String(nextDate.getMonth() + 1).padStart(2, "0")}`
  const nextLabel = `${labels[nextDate.getMonth()]} '${String(nextDate.getFullYear()).slice(-2)}`

  return [
    { value: currentVal, label: currentLabel },
    { value: nextVal, label: nextLabel },
  ]
}

export function formatDateString(value: any) {
  if (!value) return ""
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function formatMonthCapsule(value: any) {
  if (!value) return ""
  const strVal = String(value).trim()
  const match = strVal.match(/^(\d{4})(\d{2})$/)
  if (!match) return strVal
  const [_, year, monthNum] = match
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  const mIdx = parseInt(monthNum, 10) - 1
  if (mIdx < 0 || mIdx > 11) return strVal
  return `${months[mIdx]} '${year.slice(-2)}`
}