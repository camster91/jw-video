import { CheckCircle, Send, Shield, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../services/liveStream";
import type { LiveChatMessage } from "../types/live";
import "./LiveChat.css";

interface LiveChatProps {
	eventId: string;
	isOpen: boolean;
	onClose: () => void;
}

export function LiveChat({ eventId, isOpen, onClose }: LiveChatProps) {
	const [messages, setMessages] = useState<LiveChatMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const [isAutoScroll, setIsAutoScroll] = useState(true);

	// Simulate receiving live chat messages
	useEffect(() => {
		if (!isOpen) return;

		// Import the simulate function
		import("../services/liveStream").then(({ simulateLiveChat }) => {
			const unsubscribe = simulateLiveChat(eventId, (message) => {
				setMessages((prev) => {
					const updated = [...prev, message];
					// Keep last 100 messages
					if (updated.length > 100) {
						return updated.slice(-100);
					}
					return updated;
				});
			});

			return () => unsubscribe();
		});
	}, [eventId, isOpen]);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (isAutoScroll && messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [isAutoScroll]);

	// Handle scroll to detect if user has scrolled up
	const handleScroll = () => {
		if (chatContainerRef.current) {
			const { scrollTop, scrollHeight, clientHeight } =
				chatContainerRef.current;
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
			setIsAutoScroll(isNearBottom);
		}
	};

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMessage.trim() || isSending) return;

		setIsSending(true);
		try {
			const message = await sendChatMessage(eventId, newMessage.trim());
			setMessages((prev) => [...prev, message]);
			setNewMessage("");
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsSending(false);
		}
	};

	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!isOpen) return null;

	return (
		<div className="live-chat-overlay" onClick={onClose}>
			<div className="live-chat-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="live-chat-header">
					<h3>Live Chat</h3>
					<div className="chat-header-actions">
						<span className="chat-viewer-count">
							<span className="live-dot" />
							{messages.length} messages
						</span>
						<button
							type="button"
							className="chat-close-btn"
							onClick={onClose}
							aria-label="Close chat"
						>
							×
						</button>
					</div>
				</div>

				{/* Messages */}
				<div
					ref={chatContainerRef}
					className="live-chat-messages"
					onScroll={handleScroll}
				>
					{messages.length === 0 ? (
						<div className="chat-empty-state">
							<p>Chat is starting...</p>
							<p className="chat-hint">Be the first to say hello!</p>
						</div>
					) : (
						messages.map((msg) => (
							<div key={msg.id} className="chat-message">
								{msg.avatarUrl ? (
									<img
										src={msg.avatarUrl}
										alt={msg.username}
										className="chat-avatar"
									/>
								) : (
									<div className="chat-avatar-placeholder">
										<User size={16} />
									</div>
								)}
								<div className="chat-message-content">
									<div className="chat-message-header">
										<span className="chat-username">{msg.username}</span>
										{msg.isModerator && (
											<span className="chat-badge moderator">
												<Shield size={10} />
												<span>Mod</span>
											</span>
										)}
										{msg.isVerified && (
											<span className="chat-badge verified">
												<CheckCircle size={10} />
											</span>
										)}
										<span className="chat-time">
											{formatTime(msg.timestamp)}
										</span>
									</div>
									<p className="chat-message-text">{msg.message}</p>
								</div>
							</div>
						))
					)}

					{/* Scroll to bottom indicator */}
					{!isAutoScroll && messages.length > 0 && (
						<button
							type="button"
							className="scroll-to-bottom"
							onClick={() => {
								setIsAutoScroll(true);
								messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
							}}
						>
							<span>New messages ↓</span>
						</button>
					)}

					<div ref={messagesEndRef} />
				</div>

				{/* Input */}
				<form className="live-chat-input" onSubmit={handleSendMessage}>
					<input
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder="Send a message..."
						className="chat-input-field"
						maxLength={500}
						disabled={isSending}
					/>
					<button
						type="submit"
						className="chat-send-btn"
						disabled={!newMessage.trim() || isSending}
						aria-label="Send message"
					>
						<Send size={18} />
					</button>
				</form>
			</div>
		</div>
	);
}
