export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
export type AuthLevel = string & (GroupSymbol | "whitelist" | "unlocked" | "trusted" | "autoconfirmed");
