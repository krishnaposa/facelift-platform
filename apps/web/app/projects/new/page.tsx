import { getCatalogForWizard } from '@/lib/catalog-wizard';
import NewProjectWizard from './NewProjectWizard';

export default async function NewProjectPage() {
  const catalog = await getCatalogForWizard();
  return <NewProjectWizard catalog={catalog} />;
}
