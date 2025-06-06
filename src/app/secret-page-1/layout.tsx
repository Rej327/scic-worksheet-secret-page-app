import Navigation from "@/components/Navigation";

export const metadata = {
	title: "Secret Page 1 | Messages",
	description: "Secret Page App",
};

export default function layout({ children }: { children: React.ReactNode }) {
	return <Navigation>{children}</Navigation>;
}
