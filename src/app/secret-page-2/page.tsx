"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/helper/connection";
import { User } from "@supabase/supabase-js";
import Messages from "@/components/Messages";
import Loading from "@/helper/Loading";
import OverwriteMessages from "@/components/OverwriteMessages";
import api from "@/api/api";
import { createMessage, updateMessage } from "@/api/message";
import toast from "react-hot-toast";
import ConfirmationDeleteModal from "@/components/ConfirmationModal";

export default function SecretPage2() {
	// ✅ Secret Page 1 inherited State
	const [user, setUser] = useState<User | null>(null);
	const [messages, setMessages] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	// ✅ Added State
	const [newMessage, setNewMessage] = useState<string>("");
	const [editingMessageId, setEditingMessageId] = useState<string | null>(
		null
	);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(
		null
	);

	// ✅ Secret Page 1 inherited Logic
	useEffect(() => {
		const fetchData = async () => {
			const { data: authData, error: authError } =
				await supabase.auth.getUser();

			if (authError || !authData?.user) {
				toast.error("No authenticated user found.");
				setLoading(false);
				return;
			}

			const currentUser = authData.user;
			setUser(currentUser);

			const { data: userMessages, error: fetchError } =
				await api.getMessageById(currentUser.id);

			if (fetchError) {
				toast.error("Error fetching user messages:");
			} else {
				setMessages(userMessages || []);
			}

			setLoading(false);
		};

		fetchData();
	}, []);

	// ✅ Added Logic
	const handleSaveMessage = async () => {
		if (!user) return;

		const messageToSave = {
			user_id: user.id,
			message: newMessage,
			updated_at: new Date().toISOString(),
		};

		try {
			let result;

			if (editingMessageId) {
				result = await updateMessage(newMessage, editingMessageId);
				toast.success("Secret message updated!");
			} else {
				result = await createMessage(messageToSave);
				toast.success("Secret message saved!");
			}

			if (result.error) {
				toast.error("Something went wrong!");
			}
		} catch (error: any) {
			toast.error("Failed to save message. Please try again.");
		} finally {
			setTimeout(() => {
				location.reload();
			}, 1500);
		}
	};

	//Setter to edit Message
	const handleEditMessage = (id: string, text: string) => {
		setEditingMessageId(id);
		setNewMessage(text);
	};

	//Delete message function
	const handleDeleteMessage = async () => {
		if (!messageToDeleteId) return;

		try {
			const { error } = await api.deleteMessage(messageToDeleteId);

			if (error) {
				toast.error("Something went Wrong!");
			}

			toast.success("Message deleted!");
		} catch (err: any) {
			toast.error("Failed to delete message.");
		} finally {
			setShowDeleteModal(false);
			setMessageToDeleteId(null);
			setTimeout(() => {
				location.reload();
			}, 1500);
		}
	};

	//Setter to delete message (Show Modal)
	const confirmDelete = (id: string) => {
		setMessageToDeleteId(id);
		setShowDeleteModal(true);
	};

	if (loading) return <Loading loading={loading} />;

	return (
		<div className="w-auto mx-auto p-6 space-y-6">
			<h1 className="text-2xl font-bold mb-4">
				👋 Hello, {user?.user_metadata?.full_name}
			</h1>

			{/* View Message */}
			<Messages messages={messages} />

			{/* View Overwrite Message */}
			<OverwriteMessages
				message={messages}
				newMessage={newMessage}
				editingMessageId={editingMessageId}
				messages={messages}
				setNewMessage={setNewMessage}
				setEditingMessageId={setEditingMessageId}
				handleSaveMessage={handleSaveMessage}
				handleEditMessage={handleEditMessage}
				handleDeleteMessage={confirmDelete}
			/>

			{/* View confirmation modal */}
			<ConfirmationDeleteModal
				title="delete"
				text="Are you sure you want to delete this message?"
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDeleteMessage}
			/>
		</div>
	);
}
