#!/usr/bin/env bash
# Первичная настройка чистого сервера Ubuntu 24.04 для «Опоры». Запускается один раз от root,
# обычно сам GitHub Actions (workflow «Server», действие setup):
#   bash server-setup.sh "ssh-ed25519 AAAA... ключ" ["ssh-ed25519 AAAA... ещё ключ"]
# Что делает: обновляет систему, ставит Docker, создаёт пользователя deploy со входом только по ключам,
# закрывает вход по паролю и вход root, включает файрвол (22, 80, 443), fail2ban и автообновления безопасности.
set -euo pipefail

MAIN_KEY="${1:?нужен публичный SSH-ключ}"
EXTRA_KEY="${2:-}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get -y install ca-certificates curl ufw fail2ban unattended-upgrades

# Docker из официального репозитория
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# Пользователь deploy: им заходят и владелец, и GitHub Actions
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker,sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy && chmod 440 /etc/sudoers.d/deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$MAIN_KEY" > /home/deploy/.ssh/authorized_keys
[ -n "$EXTRA_KEY" ] && printf '%s\n' "$EXTRA_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys

# Папка приложения
install -d -m 750 -o deploy -g deploy /opt/opora

# SSH только по ключам, без root
cat > /etc/ssh/sshd_config.d/10-opora.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers deploy
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
CONF
mkdir -p /run/sshd && sshd -t
systemctl reload ssh || systemctl reload sshd

# Пароль root, выданный хостингом, больше не работает (вход только по ключу, root по SSH закрыт).
# Для аварийного входа через консоль в панели hoster.kz пароль можно сбросить там же.
passwd -l root

# Файрвол
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
# Голос в «Комнатах» (LiveKit): звук по UDP и запасной путь через TCP
ufw allow 7881/tcp
ufw allow 7882/udp
ufw --force enable

# fail2ban: 5 неудачных входов за 10 минут — бан IP на сутки
cat > /etc/fail2ban/jail.d/opora.local <<'CONF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1d
CONF
apt-get -y install python3-systemd >/dev/null || true
systemctl enable fail2ban
systemctl restart fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# Подкачка 2 ГБ: сборки и пики памяти не уронят сервер
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "Готово. Теперь вход только так: ssh deploy@$(hostname -I | awk '{print $1}')"
