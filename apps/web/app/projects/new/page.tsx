import { getCatalogForWizard } from '@/lib/catalog-wizard';
import NewProjectWizard from './NewProjectWizard';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const catalog = await getCatalogForWizard();
  return <NewProjectWizard catalog={catalog} />;
}
