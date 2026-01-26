package org.example.backend.global.security.details;

import lombok.Getter;
import org.example.backend.user.enums.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class PrincipalDetails implements UserDetails {

    private final User user;

    //OAuth2 도입시 사용 예정
    //Map<String, Object> attributes;

    public PrincipalDetails(User user) {
        this.user = user;
    }

    //Oauth2 도입시 사용예정
    // public PrincipalDetails(User user, Map<String, Object> attributes) {
    //     this.attributes = attributes;
    //     this.user = user;
    // }

    //시큐리티-권한정보 반환
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Collection<GrantedAuthority> authorities = new ArrayList<>();

        authorities.add(new SimpleGrantedAuthority("ROLE_"+user.getRole().name()));
        return authorities;


    //컨트롤러 - 유저 도메인 객체 변환
    public User getUser() {
        return user;
    }

    public Long getUserId() {
        return user.getId();
    }

    public String getNickname() {
        return user.getNickname();
    }

    @Override
    public String getUserName() { return user.getName(); }

    @Override
    public String getPassword() { return user.getPassword(); }

    @Override
    public String getGender() { return user.getGender(); }

    @Override
    public String getBirth() { return user.getBirth(); }

    @Override
    public Boolean getPrivacyPolicyAgreed() { return user.getPrivacyPolicyAgreed(); }

    @Override
    public String getPhoneNumber() { return user.getPhoneNumber(); }

    //
    // public CustomUserDetails(Long userId, String email, String password, List<UserRole> roles, boolean enabled) {
    //     this.userId = userId;
    //     this.email = email;
    //     this.password = password;
    //     this.roles = roles;
    //     this.enabled = enabled;
    // }




    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
