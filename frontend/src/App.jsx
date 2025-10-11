import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Enseignants from './pages/Enseignants';
import Examens from './pages/Examens';
import Voeux from './pages/Voeux';
import Generation from './pages/Generation';
import Planning from './pages/Planning';
import Export from './pages/Export';
import Statistiques from './pages/Statistiques';
import ConfigGrades from './pages/ConfigGrades';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/enseignants" element={<Enseignants />} />
        <Route path="/examens" element={<Examens />} />
        <Route path="/voeux" element={<Voeux />} />
        <Route path="/generation" element={<Generation />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/export" element={<Export />} />
        <Route path="/statistiques" element={<Statistiques />} />
        <Route path="/config-grades" element={<ConfigGrades />} />
      </Routes>
    </Layout>
  );
}

export default App;
