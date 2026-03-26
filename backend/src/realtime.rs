use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket};
use chrono::{DateTime, Utc};
use futures::{SinkExt, StreamExt};
use serde::Serialize;
use tokio::sync::{broadcast, RwLock};

#[derive(Clone)]
pub struct RealtimeHub {
    sender: broadcast::Sender<RealtimeEvent>,
    latest_snapshot: Arc<RwLock<Option<RealtimeSnapshot>>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum RealtimeEvent {
    Snapshot(RealtimeSnapshotPayload),
    Update(RealtimeUpdatePayload),
    Chat(ChatPayload),
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatPayload {
    pub id: i64,
    pub sender: String,
    pub role: String,
    pub avatar: String,
    pub province_slug: Option<String>,
    pub text: String,
    pub sent_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeSnapshotPayload {
    pub scope: String,
    pub refresh_scope: String,
    pub station_id: Option<i32>,
    pub payload: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeUpdatePayload {
    pub station_id: i32,
    pub event: String,
    pub refresh_scope: String,
    pub message: String,
}

#[derive(Debug, Clone)]
struct RealtimeSnapshot {
    scope: String,
    refresh_scope: String,
    station_id: Option<i32>,
    payload: String,
}

impl RealtimeHub {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(2048);
        Self {
            sender,
            latest_snapshot: Arc::new(RwLock::new(None)),
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<RealtimeEvent> {
        self.sender.subscribe()
    }

    pub async fn publish_snapshot(
        &self,
        scope: impl Into<String>,
        refresh_scope: impl Into<String>,
        station_id: Option<i32>,
        payload: impl Into<String>,
    ) {
        let snapshot = RealtimeSnapshot {
            scope: scope.into(),
            refresh_scope: refresh_scope.into(),
            station_id,
            payload: payload.into(),
        };

        *self.latest_snapshot.write().await = Some(snapshot.clone());
        let _ = self.sender.send(RealtimeEvent::Snapshot(RealtimeSnapshotPayload {
            scope: snapshot.scope,
            refresh_scope: snapshot.refresh_scope,
            station_id: snapshot.station_id,
            payload: snapshot.payload,
        }));
    }

    pub async fn publish_chat(
        &self,
        id: i64,
        sender: &str,
        role: &str,
        avatar: &str,
        province_slug: Option<String>,
        text: &str,
        sent_at: DateTime<Utc>,
    ) {
        let _ = self.sender.send(RealtimeEvent::Chat(ChatPayload {
            id,
            sender: sender.to_string(),
            role: role.to_string(),
            avatar: avatar.to_string(),
            province_slug,
            text: text.to_string(),
            sent_at: sent_at.to_rfc3339(),
        }));
    }

    pub async fn publish_update(
        &self,
        station_id: i32,
        event: impl Into<String>,
        refresh_scope: impl Into<String>,
        message: impl Into<String>,
    ) {
        let _ = self.sender.send(RealtimeEvent::Update(RealtimeUpdatePayload {
            station_id,
            event: event.into(),
            refresh_scope: refresh_scope.into(),
            message: message.into(),
        }));
    }

    pub async fn latest_snapshot(&self) -> Option<RealtimeEvent> {
        self.latest_snapshot
            .read()
            .await
            .as_ref()
            .map(|snapshot| RealtimeEvent::Snapshot(RealtimeSnapshotPayload {
                scope: snapshot.scope.clone(),
                refresh_scope: snapshot.refresh_scope.clone(),
                station_id: snapshot.station_id,
                payload: snapshot.payload.clone(),
            }))
    }
}

pub async fn socket_handler(ws: WebSocket, hub: RealtimeHub) {
    let (mut sender, mut receiver) = ws.split();
    let mut events = hub.subscribe();

    if let Some(snapshot) = hub.latest_snapshot().await {
        let encoded = match serde_json::to_string(&snapshot) {
            Ok(value) => value,
            Err(_) => String::from("{\"type\":\"Error\",\"data\":{\"message\":\"snapshot encode failed\"}}"),
        };

        if sender.send(Message::Text(encoded.into())).await.is_err() {
            return;
        }
    }

    loop {
        tokio::select! {
            received = events.recv() => {
                match received {
                    Ok(event) => {
                        let encoded = match serde_json::to_string(&event) {
                            Ok(value) => value,
                            Err(_) => String::from("{\"type\":\"Error\",\"data\":{\"message\":\"event encode failed\"}}"),
                        };

                        if sender.send(Message::Text(encoded.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        continue;
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            maybe_msg = receiver.next() => {
                match maybe_msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(Message::Ping(bytes))) => {
                        if sender.send(Message::Pong(bytes)).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Pong(_))) => {}
                    Some(Ok(_)) => {}
                    Some(Err(_)) => break,
                }
            }
        }
    }
}