"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/helper/connection";
import {
	FaHome,
	FaEnvelope,
	FaEdit,
	FaUsers,
	FaSignOutAlt,
	FaTrashAlt,
} from "react-icons/fa";
import { background, scic_logo_white } from "../../public/assets";
import toast from "react-hot-toast";
import ConfirmationDeleteModal from "./ConfirmationModal";
import { NavItemProps } from "@/types/navigation";
import Image from "next/image";
import Loading from "@/helper/Loading";

const NavItem: NavItemProps[] = [
	{
		href: "/",
		icon: <FaHome className="text-xl" />,
		label: "Dashboard",
	},
	{
		href: "/secret-page-1",
		icon: <FaEnvelope className="text-xl" />,
		label: "My Messages",
	},
	{
		href: "/secret-page-2",
		icon: <FaEdit className="text-xl" />,
		label: "Overwrite Msgs",
	},
	{
		href: "/secret-page-3",
		icon: <FaUsers className="text-xl" />,
		label: "Socials",
	},
];

const NavLink = ({
	href,
	icon,
	label,
}: {
	href: string;
	icon: React.ReactNode;
	label: string;
}) => {
	const pathname = usePathname();
	const isActive = pathname === href;

	return (
		<Link
			href={href}
			className={`py-2 px-4 rounded flex items-center gap-4 transition ${
				isActive
					? "bg-white/30 font-semibold cursor-default"
					: "hover:bg-white/20"
			}`}
		>
			{icon} {label}
		</Link>
	);
};

export default function Navigation({
	children,
}: {
	children: React.ReactNode;
}) {
	const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
	const [isLogout, setIslogout] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);

	const route = useRouter();

	const handleLogoutModal = () => {
		setIslogout(true);
		setShowDeleteModal(true);
	};

	const handleLogout = async () => {
		try {
			setLoading(true);
			await supabase.auth.signOut();
			route.push("/");
		} catch {
			toast.error("Error on logout");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteModal = () => {
		setIslogout(false);
		setShowDeleteModal(true);
	};

	const handleDelete = async () => {
		setLoading(true);
		const { data: userData, error: userError } =
			await supabase.auth.getUser();

		if (userError) {
			console.error("Error fetching user:", userError.message);
			return;
		}

		const id = userData?.user?.id;
		const email = userData?.user?.email;

		if (!id) {
			console.error("User ID is missing");
			return;
		}

		try {
			// Step 1: Delete from all related tables
			const tablesWithUserId = [
				"secret_messages",
				"notes",
				"todos",
				"reviews",
				"photos",
			];

			for (const table of tablesWithUserId) {
				const { error } = await supabase
					.from(table)
					.delete()
					.eq("user_id", id);
				if (error) {
					console.error(
						`Failed to delete from ${table}:`,
						error.message
					);
				}
			}

			// Delete from friend_status where user is sender or receiver
			const { error: friendStatusError } = await supabase
				.from("friend_status")
				.delete()
				.or(`sender_id${id},receiver_id${id}`);

			if (friendStatusError) {
				console.error(
					"Failed to delete from friend_status:",
					friendStatusError.message
				);
			}

			// Delete from profiles (assuming 'id' is the user's id)
			const { error: profileError } = await supabase
				.from("profiles")
				.delete()
				.eq("id", id);
			if (profileError) {
				console.error(
					"Failed to delete from profiles:",
					profileError.message
				);
			}

			await supabase.auth.signOut();
			const { error } = await supabase.auth.admin.deleteUser(id);
			setLoading(false);
			if (error) {
				toast.error("Error deleting user");
				return;
			}
		} catch (error) {
			toast.error("Unexpected error during user deletion:");
		} finally {
			if (email) {
				toast.success(`Successfully delete account: ${email}`);
			}
		}
	};

	if (loading)
		return (
			<div className="h-screen w-screen flex items-center justify-center">
				<Loading />
			</div>
		);

	return (
		<div className="flex flex-col md:flex-row min-h-screen">
			<aside className="w-full md:w-[15vw] md:fixed z-20">
				<div
					className="relative h-[450px] md:h-screen text-white flex flex-col justify-between"
					style={{
						backgroundImage: `url(${background.src})`,
						backgroundSize: "cover",
						backgroundPosition: "center",
					}}
				>
					<div className="absolute inset-0 bg-green-800/90 z-0 " />
					<div className="relative z-10 py-4">
						<div className="flex gap-2 px-4 pb-4 border-b-2 border-white/20">
							<Image
								src={scic_logo_white}
								alt="Logo"
								width={50}
								height={50}
							/>
							<div>
								<h1 className="text-xl font-semibold">
									SCIC Worksheet
								</h1>
								<p>Secret Page App</p>
							</div>
						</div>
						<nav className="flex flex-col gap-2 p-4">
							{NavItem.map((link, i) => (
								<NavLink
									key={i}
									href={link.href}
									icon={link.icon}
									label={link.label}
								/>
							))}
						</nav>
					</div>
					<div className="p-4 border-t-1 border-white/20 space-y-2 relative z-10">
						<button
							onClick={handleLogoutModal}
							className="w-full hover:bg-white/20 py-2 px-4 rounded flex items-center justify-start gap-4 cursor-pointer"
						>
							<FaSignOutAlt className="text-xl" /> Logout
						</button>
						<button
							onClick={handleDeleteModal}
							className="w-full hover:bg-white/20 py-2 px-4 rounded flex items-center justify-start gap-4 cursor-pointer"
						>
							<FaTrashAlt className="text-xl" /> Delete Account
						</button>
					</div>
				</div>
			</aside>

			<main className="w-full md:ml-[15vw] text-gray-900 p-6">
				<ConfirmationDeleteModal
					title={isLogout ? "logout" : "delete"}
					text={`Are you sure you want ${
						isLogout ? "to logout" : "to delete"
					} this account?`}
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={isLogout ? handleLogout : handleDelete}
				/>
				{children}
			</main>
		</div>
	);
}
