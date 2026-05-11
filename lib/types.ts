export type SelectedParticipant = {
  address: string;
  displayName: string;
  position: number;
  clickedAt: number;
};

export type StateUpdatePayload = {
  isPickOpen: boolean;
  participantsCount: number;
  selected: SelectedParticipant[];
};

export type ParticipantResultPayload = {
  selected: boolean;
  position?: number;
  message: string;
};

export type ParticipantJoinPayload = {
  address: string;
  displayName: string;
  signature: string;
  message: string;
};

export type ParticipantPickPayload = {
  address: string;
};

export type SocketAck = {
  ok: boolean;
  error?: string;
};
