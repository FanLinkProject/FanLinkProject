package org.example.backend.global.security.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public abstract class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    //페널티,레포트 레파짓토리

    //@Override
    @Transactional
    public UserDetails loadByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저를 찾수 없습니다."));


        return new PrincipalDetails(user);
    }
}

        // UserRole role = user.getRole();
        // if (role == null) {
        //     throw new UsernameNotFoundException("user has no roles : " + email);
        // }
        //


//
//         List<UserRole> roles = List.of(role);
//
//         return new UserDetails(
//                 user.getId(),
//                 user.getEmail(),
//                 user.getPassword(),
//                 roles,
//                 user.getStatus() != null && user.getStatus() == UserStatus.ACTIVE
//         );
//     }
// }
