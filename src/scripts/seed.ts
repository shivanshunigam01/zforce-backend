import { connectDb } from "../db/mongoose";
import { hashPassword } from "../utils/auth";
import Tenant from "../models/Tenant";
import Storefront from "../models/Storefront";
import User from "../models/User";

async function main() {
  await connectDb();

  await Tenant.findOneAndUpdate(
    { tenantId: "tenant-demo" },
    { tenantId: "tenant-demo", name: "Demo Distributor", status: "active" },
    { upsert: true, new: true }
  );

  await Storefront.findOneAndUpdate(
    { slug: "patna-auto" },
    {
      slug: "patna-auto",
      dealerId: "dealer-demo",
      tenantId: "tenant-demo",
      dealerName: "Patna Auto House",
      isActive: true,
      siteSettings: {
        phone: "9999999999",
        whatsapp: "9999999999",
        email: "dealer@example.com",
        address: "Patna, Bihar"
      },
      nav: {
        items: [
          { path: "/", label: "Home" },
          { path: "/products", label: "Products" },
          { path: "/gallery", label: "Gallery" },
          { path: "/finance", label: "Finance" },
          { path: "/cibil", label: "CIBIL Check" },
          { path: "/about", label: "About" },
          { path: "/contact", label: "Contact" }
        ]
      },
      homeSections: {
        hero: { slides: [] },
        features: { title: "Features", items: [] },
        offers: { title: "Offers", cards: [] }
      }
    },
    { upsert: true, new: true }
  );

  const passwordHash = await hashPassword("Password@123");

  await User.findOneAndUpdate(
    { userId: "admin" },
    { userId: "admin", email: "admin@example.com", displayName: "Super Admin", passwordHash, role: "super_admin", isActive: true },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { userId: "distributor" },
    { userId: "distributor", email: "distributor@example.com", displayName: "Distributor User", passwordHash, role: "distributor", tenantId: "tenant-demo", isActive: true },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { userId: "dealer" },
    { userId: "dealer", email: "dealer@example.com", displayName: "Dealer User", passwordHash, role: "dealer", tenantId: "tenant-demo", dealerId: "dealer-demo", branchIds: ["branch-1"], isActive: true },
    { upsert: true, new: true }
  );

  console.log("Seed complete");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
