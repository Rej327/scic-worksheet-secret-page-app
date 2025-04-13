"use client";

import api from "@/api/api";
import { createMessage, updateMessage } from "@/api/message";
import Messages from "@/components/Messages";
import OverwriteMessages from "@/components/OverwriteMessages";
import Social from "@/components/Social";
import { supabase } from "@/helper/connection";
import Loading from "@/helper/Loading";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SecretPage3() {
	const [user, setUser] = useState<User | null>(null);
	const [messages, setMessages] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [newMessage, setNewMessage] = useState<string>("");
	const [editingMessageId, setEditingMessageId] = useState<string | null>(
		null
	);

	const [currentUser, setCurrentUser] = useState<any>(null);
	const [users, setUsers] = useState<any[]>([]);
	const [friends, setFriends] = useState<any[]>([]);
	const [requests, setRequests] = useState<any[]>([]);

	const [sentRequests, setSentRequests] = useState<any[]>([]);
	const [viewedMessages, setViewedMessages] = useState<{
		[key: string]: string[];
	}>({});
	const [viewingError, setViewingError] = useState<string | null>(null);
	const [friendMessages, setFriendMessages] = useState<any[]>([]);
	const [isMyMessage, setIsMyMessage] = useState<boolean>(true);

	const router = useRouter();

	useEffect(() => {
		const fetchData = async () => {
			// ✅ Original logic
			const { data: authData, error: authError } =
				await supabase.auth.getUser();

			if (authError || !authData?.user) {
				console.error("No authenticated user found.");
				setLoading(false);
				return;
			}

			const currentUser = authData.user;
			setUser(currentUser);

			const { data: userMessages, error: fetchError } =
				await api.getMessageById(currentUser.id);

			if (fetchError) {
				console.error(
					"Error fetching user messages:",
					fetchError.message
				);
			} else {
				setMessages(userMessages || []);
			}

			// ✅ New extended logic
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.user) {
				alert("Unauthorized");
				return;
			}

			const user = session.user;
			setCurrentUser(user);

			const { data: allUsers } = await api.getProfile();

			const { data: allRequests } = await api.getFriendsByBothId(user.id);

			const accepted = allRequests?.filter(
				(r) => r.status === "accepted"
			);
			const friendIds = accepted?.map((r) =>
				r.sender_id === user.id ? r.receiver_id : r.sender_id
			);

			const incoming = allRequests?.filter(
				(r) => r.receiver_id === user.id && r.status === "pending"
			);

			const nonFriends = allUsers?.filter(
				(u) =>
					u.id !== user.id &&
					!friendIds?.includes(u.id) &&
					!incoming?.some((r) => r.sender_id === u.id) &&
					!allRequests?.some(
						(r) =>
							(r.sender_id === user.id ||
								r.receiver_id === user.id) &&
							(r.receiver_id === u.id || r.sender_id === u.id) &&
							r.status === "pending"
					)
			);

			const enrichedRequests = incoming?.map((req) => {
				const senderProfile = allUsers?.find(
					(u) => u.id === req.sender_id
				);
				return {
					...req,
					sender_full_name: senderProfile?.full_name || "Unknown",
				};
			});

			const outgoing = allRequests?.filter(
				(r) => r.sender_id === user.id && r.status === "pending"
			);

			const enrichedSentRequests = outgoing?.map((req) => {
				const receiverProfile = allUsers?.find(
					(u) => u.id === req.receiver_id
				);
				return {
					...req,
					receiver_full_name: receiverProfile?.full_name || "Unknown",
					receiver_id: receiverProfile?.id,
				};
			});

			// setMessages(userMessage || []);
			setUsers(nonFriends || []);
			setFriends(
				allUsers?.filter((u) => friendIds?.includes(u.id)) || []
			);
			setRequests(enrichedRequests || []);
			setSentRequests(enrichedSentRequests || []);

			setLoading(false);
		};

		fetchData();
	}, []);

	const sendRequest = async (receiver_id: string) => {
		if (!currentUser) return;

		// Update button text state immediately
		const updatedUsers = users.map((user) =>
			user.id === receiver_id
				? { ...user, requestSent: true } // Mark that request is sent
				: user
		);
		setUsers(updatedUsers);

		const { error } = await api.sentRequest({
			sender_id: currentUser.id,
			receiver_id: receiver_id,
		});

		if (error) {
			alert("Error sending request");
			console.error(error.message);
		} else {
			alert("Friend request sent!");
			// We do NOT reload, just update the button state
		}
	};

	const cancelRequest = async (receiver_id: string) => {
		if (!currentUser) return;

		// Find the request sent by the current user to the receiver
		const { data: sentRequests } = await api.cancelRequest({
			currentUserId: currentUser.id,
			receiver_id: receiver_id,
		});

		if (sentRequests && sentRequests.length > 0) {
			const requestId = sentRequests[0].id;

			// Delete the request from the database
			const { error } = await api.deleteRequest(requestId);

			if (error) {
				alert("Error canceling request");
				console.error(error.message);
			} else {
				alert("Friend request canceled!");
				// Update the UI
				const updatedUsers = users.map((user) =>
					user.id === receiver_id
						? { ...user, requestSent: false } // Mark that the request was canceled
						: user
				);

				setUsers(updatedUsers);
				location.reload();
			}
		}
	};

	const respondToRequest = async (
		id: string,
		status: "accepted" | "rejected"
	) => {
		if (status === "accepted") {
			const { error } = await api.acceptRequest({
				status: status,
				id: id,
			});

			if (error) {
				alert("Error accepting request");
				console.error(error.message);
			} else {
				alert("Request accepted");
				location.reload();
			}
		} else if (status === "rejected") {
			const { error } = await api.rejectRequest(id);

			if (error) {
				alert("Error rejecting request");
				console.error(error.message);
			} else {
				alert("Request rejected and deleted");
				location.reload();
			}
		}
	};

	const viewMessages = async (friendId: string) => {
		if (!currentUser) {
			console.warn("⚠️ No current user.");
			return;
		}

		const isFriend = friends.some((friend) => friend.id === friendId);

		if (!isFriend) {
			// Throw 403 and redirect to custom page
			router.push("/403-forbidden"); // 👈 Make sure this route exists
			throw new Error("403: Forbidden - Not a friend");
		}

		try {
			const { data, error } = await api.getMessageById(friendId);

			if (error) {
				console.error("❌ Supabase Fetch Error:", error);
				return;
			}

			setFriendMessages(data || []);
			setIsMyMessage(false);
		} catch (err) {
			console.error("🚨 Unexpected Error:", err);
		}
	};

	const handleSaveMessage = async () => {
		if (!currentUser) return;

		const messageToSave = {
			user_id: currentUser.id,
			message: newMessage,
			updated_at: new Date().toISOString(),
		};

		let saveError;

		if (editingMessageId) {
			const { error } = await updateMessage(newMessage, editingMessageId);
			saveError = error;
		} else {
			const { error } = await createMessage(messageToSave);
			saveError = error;
		}

		if (saveError) {
			console.error("Error saving message:", saveError.message);
		} else {
			alert("Secret message saved!");
			location.reload(); // consider using re-fetch instead
		}
	};

	const handleEditMessage = (id: string, text: string) => {
		setEditingMessageId(id);
		setNewMessage(text);
	};

	const handleDeleteMessage = async (id: string) => {
		if (confirm("Are you sure you want to delete this message?")) {
			const { error } = await api.deleteMessage(id);
			if (error) {
				console.error("Delete error:", error.message);
			} else {
				alert("Message deleted");
				location.reload(); // consider using re-fetch instead
			}
		}
	};

	const cancelViewFriendMessage = () => {
		setIsMyMessage(true);
	};

	if (loading) return <Loading loading={loading} />;

	return (
		<div className="w-auto mx-auto p-6 space-y-6">
			<h1 className="text-2xl font-bold mb-4">
				👋 Hello, {user?.user_metadata?.full_name}
			</h1>
			<Messages
				messages={isMyMessage ? messages : friendMessages}
				title={
					isMyMessage
						? "Your Secret Messages"
						: "Friend Secret Messages"
				}
			/>

			<OverwriteMessages
				message={messages}
				newMessage={newMessage}
				editingMessageId={editingMessageId}
				messages={messages}
				setNewMessage={setNewMessage}
				setEditingMessageId={setEditingMessageId}
				handleSaveMessage={handleSaveMessage}
				handleEditMessage={handleEditMessage}
				handleDeleteMessage={handleDeleteMessage}
				disabled={!isMyMessage}
				onGoBack={cancelViewFriendMessage}
			/>

			<Social
				users={users}
				sentRequests={sentRequests}
				requests={requests}
				friends={friends}
				viewedMessages={viewedMessages}
				viewingError={viewingError}
				sendRequest={sendRequest}
				cancelRequest={cancelRequest}
				respondToRequest={respondToRequest}
				viewMessages={viewMessages}
			/>
		</div>
	);
}
