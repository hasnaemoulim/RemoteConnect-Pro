import React from 'react';

const QueueStatus = ({ hasControl, queuePosition }) => {
    if (hasControl) {
        return (
            <div className="queue-status controlling">
                <span>🎮 Vous contrôlez actuellement l'écran</span>
                <small>Timeout automatique dans 2 minutes d'inactivité</small>
            </div>
        );
    }

    if (queuePosition > 0) {
        return (
            <div className="queue-status waiting">
                <span>⏳ En file d'attente - Position: {queuePosition}</span>
                <small>Vous obtiendrez le contrôle automatiquement</small>
            </div>
        );
    }

    return (
        <div className="queue-status viewing">
            <span>👀 Mode spectateur</span>
            <small>Cliquez sur "Demander le contrôle" pour prendre le contrôle</small>
        </div>
    );
};

export default QueueStatus;
