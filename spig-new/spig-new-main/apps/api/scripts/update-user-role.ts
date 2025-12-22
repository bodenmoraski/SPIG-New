import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserRole(email: string, role: Role) {
  try {
    // Find user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
    });

    console.log(`✅ Successfully updated ${updatedUser.email} to role: ${updatedUser.role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email and role from command line arguments
const email = process.argv[2];
const roleArg = process.argv[3]?.toUpperCase();

if (!email || !roleArg) {
  console.error('Usage: ts-node update-user-role.ts <email> <role>');
  console.error('Example: ts-node update-user-role.ts user@example.com TEACHER');
  process.exit(1);
}

const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
if (!validRoles.includes(roleArg)) {
  console.error(`Invalid role: ${roleArg}. Must be one of: ${validRoles.join(', ')}`);
  process.exit(1);
}

updateUserRole(email, roleArg as Role);

