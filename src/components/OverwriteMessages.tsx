import React from 'react';

interface Message {
  id: string;
  message: string;
}

interface OverwriteMessagesProps {
  message: string | null;
  newMessage: string;
  editingMessageId: string | null;
  messages: Message[];
  setNewMessage: (value: string) => void;
  setEditingMessageId: (id: string | null) => void;
  handleSaveMessage: () => void;
  handleEditMessage: (id: string, message: string) => void;
  handleDeleteMessage: (id: string) => void;
}

export default function OverwriteMessages({
  message,
  newMessage,
  editingMessageId,
  messages,
  setNewMessage,
  setEditingMessageId,
  handleSaveMessage,
  handleEditMessage,
  handleDeleteMessage,
}: OverwriteMessagesProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h2 className="text-lg font-semibold mb-3">
        {editingMessageId ? "Edit Secret Message" : "Write a Secret Message"}
      </h2>

      <div className="mb-4">
        <p className="text-gray-700">Recent Message: {message}</p>
      </div>

      <textarea
        className="w-full p-2 mb-4 border border-gray-300 rounded-md"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Write your secret message..."
      />

      <div className="flex space-x-2">
        <button
          className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={handleSaveMessage}
        >
          {editingMessageId ? "Update Message" : "Save Message"}
        </button>
        {editingMessageId && (
          <button
            className="w-full p-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            onClick={() => {
              setEditingMessageId(null);
              setNewMessage("");
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-md font-semibold mb-2">
          Tap to Edit Your Previous Messages
        </h3>
        <ul className="space-y-2">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <li
                key={msg.id}
                className="flex justify-between items-center p-4 bg-gray-100 rounded-md shadow-sm"
              >
                <span className="text-gray-800 break-words w-full mr-4">
                  {msg.message}
                </span>
                <div className="flex space-x-2 shrink-0">
                  <button
                    className="px-3 py-1 bg-yellow-400 text-white rounded-md hover:bg-yellow-500 text-sm"
                    onClick={() => handleEditMessage(msg.id, msg.message)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                    onClick={() => handleDeleteMessage(msg.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="p-4 bg-gray-100 rounded-md shadow-sm">
              No messages to edit.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
