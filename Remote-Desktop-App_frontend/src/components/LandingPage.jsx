import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Stack,
  Avatar,
  Paper,
  IconButton,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MonitorIcon from '@mui/icons-material/Monitor';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import GroupsIcon from '@mui/icons-material/Groups';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PublicIcon from '@mui/icons-material/Public';
import ChatIcon from '@mui/icons-material/Chat';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SecurityIcon from '@mui/icons-material/Security';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

// Mets ici le bon chemin vers ton image hero
import remoteHero from '../assets/rem3.jpg';
import contactIllustration from '../assets/contact.jpg';
import safiaPhoto from '../assets/hafsa.jpg';
import hasnaePhoto from '../assets/hafsa.jpg';
import hafsaPhoto from '../assets/hafsa.jpg';


// --- Données ---
const stats = [
  { label: 'Utilisateurs actifs', value: '50K+', icon: <GroupsIcon sx={{ color: '#facc15' }} /> },
  { label: 'Sessions quotidiennes', value: '2K+', icon: <ShowChartIcon sx={{ color: '#facc15' }} /> },
  { label: 'Disponibilité', value: '99.99%', icon: <CheckCircleIcon sx={{ color: '#facc15' }} /> },
  { label: 'Pays', value: '120+', icon: <PublicIcon sx={{ color: '#facc15' }} /> },
];

const features = [
  {
    icon: <MonitorIcon sx={{ fontSize: 32, color: '#38bdf8' }} />,
    title: "Partage d'écran HD",
    description: "Qualité cristalline avec latence ultra-faible pour une expérience fluide et professionnelle.",
    gradient: "linear-gradient(90deg,#38bdf8,#2ee7e7)",
  },
  {
    icon: <ChatIcon sx={{ fontSize: 32, color: '#10b981' }} />,
    title: "Chat en temps réel",
    description: "Communication instantanée avec tous les participants grâce à notre système de messagerie avancé.",
    gradient: "linear-gradient(90deg,#10b981,#14b8a6)",
  },
  {
    icon: <CloudUploadIcon sx={{ fontSize: 32, color: '#fb923c' }} />,
    title: "Transfert sécurisé",
    description: "Partagez des fichiers jusqu'à 100MB avec chiffrement militaire AES-256.",
    gradient: "linear-gradient(90deg,#fb923c,#fbbf24)",
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 32, color: '#c026d3' }} />,
    title: "Sécurité maximale",
    description: "Protection bout en bout avec authentification multi-facteurs et conformité RGPD.",
    gradient: "linear-gradient(90deg,#a21caf,#ec4899)",
  },
];

const teamMembers = [
  {
    name: "Safia Zitouni",
    role: " software engineering student",
    photo: safiaPhoto,
    description: "Focused on elegant UI, intuitive UX, and collaborative project management.",
    skills: ["React", "MUI", "Java", "WebSocket", "Figma", "Trello"],
    gradient: "linear-gradient(90deg,#2563eb,#a21caf)",
  },
  {
    name: "Hasnae Moulim",
    role: "Software engineering student",
    photo: hasnaePhoto,
    description: "Passionate about building robust Java/React systems and seamless real-time collaboration.",
    skills: ["React", "MUI", "Java", "WebSocket", "Figma", "Trello"],
    gradient: "linear-gradient(90deg,#ec4899,#f43f5e)",
  },
  {
    name: "Hafsa Merzouk",
    role: " software engineering student",
    photo: hafsaPhoto,
    description: "Enjoys optimizing real-time features and designing modern interfaces.",
    skills: ["React", "MUI", "Java", "WebSocket", "Figma", "Trello"],
    gradient: "linear-gradient(90deg,#10b981,#06b6d4)",
  },
];


const faqs = [
  {
    question: "Comment démarrer une session de partage d'écran ?",
    answer: "Cliquez sur 'Démarrer maintenant', connectez-vous et suivez les instructions pour lancer une session sécurisée.",
  },
  {
    question: "Mes données sont-elles protégées ?",
    answer: "Oui, toutes les communications et transferts sont chiffrés de bout en bout avec des protocoles de sécurité avancés.",
  },
  {
    question: "Puis-je inviter des utilisateurs externes ?",
    answer: "Oui, vous pouvez inviter n'importe quel utilisateur via un lien sécurisé, même s'il n'a pas de compte.",
  },
  {
    question: "Le service est-il compatible mobile ?",
    answer: "Oui, RemoteConnect Pro fonctionne sur tous les navigateurs modernes, y compris sur mobile et tablette.",
  },
];

const ModernLandingPage = ({ onGetStarted }) => (
  <Box
    sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #232e4d 0%, #25325a 100%)',
      color: 'white',
      overflow: 'hidden',
    }}
  >
    {/* Header */}
    <Box
      sx={{
        bgcolor: 'rgba(25,34,58,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 3,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Container maxWidth="lg" sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: '#38bdf8', width: 40, height: 40 }}>
            <MonitorIcon />
          </Avatar>
          <Typography variant="h6" fontWeight={700}>
            RemoteConnect Pro
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Button
  variant="outlined"
  startIcon={<GitHubIcon />}
  onClick={() => window.open('https://github.com/Zitouni12/Projet_Partage_Ecran_Java.git', '_blank')}
  sx={{
    color: 'white',
    borderColor: 'rgba(255,255,255,0.2)',
    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.07)' },
  }}
>
  GitHub
</Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={onGetStarted}
            sx={{
              background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
              fontWeight: 700,
              boxShadow: 6,
              '&:hover': { background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)' },
            }}
          >
            Commencer
          </Button>
        </Stack>
      </Container>
    </Box>

    {/* Hero Section */}
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Grid container alignItems="center" spacing={6}>
        {/* Texte à gauche */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: 2,
                mb: 1,
              }}
            >
              REMOTE CONNECT
            </Typography>
            <Typography variant="subtitle1" color="grey.300" mb={2}>
              Connect to a remote computer.
            </Typography>
            <Typography variant="h4" fontWeight={700} mb={1} sx={{ mt: 4 }}>
              Partage d'écran{' '}
              <Box component="span" sx={{ color: '#facc15' }}>
                nouvelle génération
              </Box>
            </Typography>
            <Typography variant="body1" color="grey.300" mb={4}>
              Révolutionnez votre collaboration avec une solution de partage d'écran ultra-sécurisée, des performances exceptionnelles et une expérience utilisateur inégalée.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                size="large"
                sx={{
                  background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
                  fontWeight: 700,
                  px: 4,
                  boxShadow: 6,
                  '&:hover': { background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)' },
                }}
                onClick={onGetStarted}
              >
                Démarrer maintenant
              </Button>
             <a
  href="/RemoteConnect-Pro.pdf"
  download="RemoteConnect-Pro.pdf"
  style={{ textDecoration: 'none' }}
>
  <Button
    variant="outlined"
    startIcon={<DownloadIcon />}
    size="large"
    sx={{
      color: 'white',
      borderColor: 'rgba(255,255,255,0.2)',
      fontWeight: 700,
      px: 4,
      '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56,189,248,0.07)' },
    }}
  >
    Télécharger
  </Button>
</a>
            </Stack>
          </Box>
        </Grid>
        {/* Image à droite, agrandie et responsive */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: { xs: 350, sm: 480, md: 600, lg: 720 },
              aspectRatio: '4/3',
              borderRadius: 4,
              boxShadow: 6,
              background: 'rgba(255,255,255,0.05)',
              overflow: 'hidden',
              minHeight: { xs: 200, sm: 300, md: 400 },
            }}
          >
            <Box
              component="img"
              src={remoteHero}
              alt="Remote Connect Illustration"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 4,
              }}
            />
          </Box>
        </Grid>
      </Grid>

      {/* Statistiques */}
      <Grid container spacing={3} justifyContent="center" sx={{ mt: { xs: 6, md: 10 } }}>
        {stats.map((stat, idx) => (
          <Grid item xs={6} md={3} key={idx}>
            <Paper
              elevation={3}
              sx={{
                py: 3,
                px: 2,
                bgcolor: 'rgba(255,255,255,0.07)',
                textAlign: 'center',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Box mb={1}>{stat.icon}</Box>
              <Typography variant="h4" fontWeight={700} color="white">
                {stat.value}
              </Typography>
              <Typography variant="body2" color="grey.300">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>

    {/* Features */}
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={700} align="center" mb={2}>
          Fonctionnalités de pointe
        </Typography>
        <Typography variant="h6" color="grey.300" align="center" mb={5}>
          Découvrez les outils qui transformeront votre façon de collaborer
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, idx) => (
            <Grid item xs={12} md={6} key={idx}>
              <Paper
                elevation={4}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 5,
                  bgcolor: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.03)', bgcolor: 'rgba(255,255,255,0.13)' },
                }}
              >
                <Box
                  sx={{
                    mr: 3,
                    minWidth: 64,
                    minHeight: 64,
                    borderRadius: 3,
                    background: feature.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 3,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    {feature.title}
                  </Typography>
                  <Typography color="grey.300">{feature.description}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* Team */}
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={700} align="center" mb={2}>
          Notre équipe d'experts
        </Typography>
        <Typography variant="h6" color="grey.300" align="center" mb={5}>
          Des passionnés de technologie dédiés à l'innovation
        </Typography>
        <Grid container spacing={4}>
          {teamMembers.map((member, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Paper
                elevation={4}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 5,
                  bgcolor: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.05)', bgcolor: 'rgba(255,255,255,0.13)' },
                }}
              >
                <Avatar
  src={member.photo}
  alt={member.name}
  sx={{
    width: 120,
    height: 120,
    mx: 'auto',
    mb: 2,
    fontSize: 40,
    fontWeight: 700,
    color: 'white',
    background: member.gradient,
    border: '4px solid #fff',
    boxShadow: 4,
    objectFit: 'cover'
  }}
/>


                <Typography variant="h6" fontWeight={700}>
                  {member.name}
                </Typography>
                <Typography
                  sx={{
                    display: 'inline-block',
                    px: 2,
                    py: 0.5,
                    bgcolor: 'rgba(33,150,243,0.13)',
                    color: '#38bdf8',
                    borderRadius: 2,
                    fontSize: 14,
                    fontWeight: 500,
                    mb: 2,
                  }}
                >
                  {member.role}
                </Typography>
                <Typography color="grey.300" mb={2}>
                  {member.description}
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                  {member.skills.map((skill, i) => (
                    <Box
                      key={i}
                      sx={{
                        px: 2,
                        py: 0.5,
                        bgcolor: 'rgba(255,255,255,0.09)',
                        color: 'grey.100',
                        borderRadius: 2,
                        fontSize: 13,
                        mb: 1,
                      }}
                    >
                      {skill}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* CTA */}
    <Box textAlign="center" mb={6}>
      <Paper
        elevation={6}
        sx={{
          display: 'inline-block',
          px: { xs: 2, md: 8 },
          py: { xs: 4, md: 6 },
          bgcolor: 'rgba(56,189,248,0.10)',
          borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.13)',
          mb: 4,
          background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 100%)',
        }}
      >
        <Typography variant="h4" fontWeight={700} mb={2}>
          Prêt à transformer votre collaboration ?
        </Typography>
        <Typography variant="h6" color="grey.300" mb={4}>
          Rejoignez des milliers d'équipes qui ont choisi RemoteConnect Pro pour révolutionner leur façon de travailler ensemble.
        </Typography>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          size="large"
          onClick={onGetStarted}
          sx={{
            background: 'linear-gradient(90deg, #fb923c 0%, #ec4899 100%)',
            fontWeight: 700,
            px: 7,
            boxShadow: 6,
            '&:hover': { background: 'linear-gradient(90deg, #f59e42 0%, #db2777 100%)' },
          }}
        >
          Commencer gratuitement
        </Button>
      </Paper>
    </Box>

    {/* Section Contact : Image à gauche, formulaire à droite */}
<Box sx={{ py: { xs: 4, md: 6 }, bgcolor: 'rgba(255,255,255,0.03)' }}>
  <Container maxWidth="lg">
    <Paper
      elevation={4}
      sx={{
        p: { xs: 2, md: 4 },
        borderRadius: 5,
        bgcolor: 'rgba(30,41,59,0.98)',
        border: '1px solid rgba(56,189,248,0.13)',
        mb: 4,
      }}
    >
      <Grid container spacing={4} alignItems="center">
        {/* Image à gauche */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={contactIllustration}
            alt="Contact illustration"
            sx={{
              width: '100%',
              maxWidth: 480,          // Agrandit la largeur
              aspectRatio: '16/9',    // Moins haut que 4/3
              borderRadius: 4,
              objectFit: 'cover',
              boxShadow: 4,
              background: 'rgba(56,189,248,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Grid>
        {/* Formulaire à droite */}
        <Grid item xs={12} md={6}>
          <Typography variant="h4" fontWeight={700} mb={2} align="center">
            Contactez-nous
          </Typography>
          <Typography color="grey.300" mb={4} align="center">
            Une question ? Une démo ? Écrivez-nous, notre équipe vous répondra rapidement.
          </Typography>
          <form
  action="https://formspree.io/f/xwpbbakl" // Remplace par TON URL Formspree !
  method="POST"
  style={{ width: '100%' }}
>
  <Stack spacing={3}>
    <TextField
      label="Nom"
      name="name"
      variant="filled"
      fullWidth
      required
      InputProps={{ style: { background: 'rgba(255,255,255,0.1)', color: 'white' } }}
      InputLabelProps={{ style: { color: '#38bdf8' } }}
    />
    <TextField
      label="Adresse e-mail"
      name="email"
      type="email"
      variant="filled"
      fullWidth
      required
      InputProps={{ style: { background: 'rgba(255,255,255,0.1)', color: 'white' } }}
      InputLabelProps={{ style: { color: '#38bdf8' } }}
    />
    <TextField
      label="Votre message"
      name="message"
      variant="filled"
      fullWidth
      required
      multiline
      minRows={4}
      InputProps={{ style: { background: 'rgba(255,255,255,0.1)', color: 'white' } }}
      InputLabelProps={{ style: { color: '#38bdf8' } }}
    />
    <Button
      type="submit"
      variant="contained"
      size="large"
      sx={{
        background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
        fontWeight: 700,
        boxShadow: 6,
        '&:hover': { background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)' },
      }}
    >
      Envoyer
    </Button>
  </Stack>
</form>

        </Grid>
      </Grid>
    </Paper>
  </Container>
</Box>

    {/* Section FAQ */}
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={700} align="center" mb={4}>
          Foire aux questions
        </Typography>
        {faqs.map((faq, idx) => (
          <Accordion key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: 'white', mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#38bdf8' }} />}>
              <Typography variant="h6">{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="grey.300">{faq.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </Box>

    {/* Footer */}
    <Box
      sx={{
        bgcolor: 'rgba(0,0,0,0.20)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        py: 6,
        mt: 6,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Avatar sx={{ bgcolor: '#38bdf8', width: 36, height: 36 }}>
                <MonitorIcon />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                RemoteConnect Pro
              </Typography>
            </Stack>
            <Typography color="grey.300" maxWidth="sm">
              La solution de partage d'écran la plus avancée pour les équipes modernes. Sécurisé, performant et intuitif.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} textAlign={{ xs: 'left', md: 'right' }}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.20)' } }}>
                <GitHubIcon />
              </IconButton>
              <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.20)' } }}>
                <LinkedInIcon />
              </IconButton>
              <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.20)' } }}>
                <MailOutlineIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
        <Box borderTop="1px solid rgba(255,255,255,0.07)" mt={5} pt={3} textAlign="center">
          <Typography color="grey.400">
            © 2025 RemoteConnect Pro. Tous droits réservés. Développé avec <Box component="span" sx={{ color: '#ef4444', display: 'inline' }}>❤️</Box> par l'équipe RemoteConnect.
          </Typography>
        </Box>
      </Container>
    </Box>
  </Box>
);

export default ModernLandingPage;
